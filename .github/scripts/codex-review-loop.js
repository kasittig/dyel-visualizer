const CODEX_BOT_LOGIN = 'chatgpt-codex-connector[bot]';
const VERDICT_PATTERN = /<!-- codex-review-verdict: (\{[^\n]+\}) -->/;
const REQUEST_PATTERN = /<!-- codex-review-loop:request:revision:(\d+):head:([0-9a-f]{40}) -->/;

const parseVerdict = (body) => {
  const match = body?.match(VERDICT_PATTERN);
  if (!match) return null;
  try {
    const verdict = JSON.parse(match[1]);
    if (
      verdict?.actionable === false &&
      verdict.highest_severity === null &&
      verdict.finding_count === 0
    ) {
      return verdict;
    }
    if (
      verdict?.actionable === true &&
      ['P0', 'P1'].includes(verdict.highest_severity) &&
      Number.isInteger(verdict.finding_count) &&
      verdict.finding_count > 0
    ) {
      return verdict;
    }
  } catch {
    return null;
  }
  return null;
};

const selectReview = (reviews, headSha) =>
  reviews.findLast(
    (review) =>
      review.commit_id === headSha &&
      review.user?.login === CODEX_BOT_LOGIN &&
      parseVerdict(review.body),
  );

const deriveRevision = async (comments, headSha, compare) => {
  const requests = [];
  for (const comment of comments) {
    const match =
      comment.user?.login === 'github-actions[bot]' && comment.body?.match(REQUEST_PATTERN);
    if (match) requests.push({ revision: Number(match[1]), head: match[2] });
  }
  const ancestry = await Promise.all(
    requests.map(async (request) => ({ ...request, status: await compare(request.head, headSha) })),
  );
  let revision = 0;
  for (const request of ancestry) {
    if (request.revision > revision && ['ahead', 'identical'].includes(request.status)) {
      revision = request.revision;
    }
  }
  return revision;
};

const planOutcome = (review, revisions, maxRevisions) => {
  if (!review) return { type: 'timeout' };
  const verdict = parseVerdict(review.body);
  if (!verdict) return { type: 'invalid' };
  if (!verdict.actionable) return { type: 'clean', verdict };
  if (revisions >= maxRevisions) return { type: 'cap', verdict };
  return { type: 'request', verdict, revision: revisions + 1 };
};

const buildHandoff = (outcome, humanReviewer, maxRevisions, headSha) => {
  if (outcome.type === 'clean') {
    return {
      add: ['human-review-ready', '2da44e', 'Codex review is clear; ready for human review'],
      remove: 'human-review-needed',
      body: `@${humanReviewer} Codex found no blocking issues in its latest review. This PR is ready for your manual review.`,
    };
  }
  if (outcome.type === 'cap') {
    return {
      add: ['human-review-needed', 'd93f0b', 'Codex revision cap reached; human attention needed'],
      remove: 'human-review-ready',
      body: `@${humanReviewer} Codex still has ${outcome.verdict.finding_count} actionable finding(s) after ${maxRevisions} revision rounds. The automation stopped here for manual review.`,
    };
  }
  if (outcome.type === 'invalid') {
    return {
      add: ['human-review-needed', 'd93f0b', 'Codex review verdict missing or invalid'],
      remove: 'human-review-ready',
      body: `@${humanReviewer} Codex did not return a valid machine-readable verdict for ${headSha.slice(0, 7)}. The automation stopped for manual review.`,
    };
  }
  return {
    add: ['human-review-needed', 'd93f0b', 'Codex review timed out; human attention needed'],
    remove: 'human-review-ready',
    body: `@${humanReviewer} Codex did not finish reviewing ${headSha.slice(0, 7)} within 30 minutes. The automation stopped for manual review.`,
  };
};

const hasMarker = (comments, marker) =>
  comments.some(
    (comment) =>
      comment.user?.login === 'github-actions[bot]' && comment.body?.includes(marker),
  );

const selectResolvableThreadIds = (threads) => {
  const ids = [];
  for (const thread of threads) {
    if (
      !thread.isResolved &&
      thread.comments.nodes.some((comment) => comment.author?.login === CODEX_BOT_LOGIN)
    ) {
      ids.push(thread.id);
    }
  }
  return ids;
};

const resolveCodexThreads = async (github, owner, repo, issueNumber) => {
  let after = null;
  do {
    const result = await github.graphql(
      `query($owner: String!, $repo: String!, $issueNumber: Int!, $after: String) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $issueNumber) {
            reviewThreads(first: 100, after: $after) {
              nodes {
                id
                isResolved
                comments(first: 100) { nodes { author { login } } }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }
      }`,
      { owner, repo, issueNumber, after },
    );
    const threads = result.repository.pullRequest.reviewThreads;
    for (const threadId of selectResolvableThreadIds(threads.nodes)) {
      await github.graphql(
        `mutation($threadId: ID!) {
          resolveReviewThread(input: { threadId: $threadId }) { thread { id } }
        }`,
        { threadId },
      );
    }
    after = threads.pageInfo.hasNextPage ? threads.pageInfo.endCursor : null;
  } while (after);
};

const run = async ({ github, context, core }) => {
  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const issue_number = context.payload.pull_request.number;
  const maxRevisions = Number(process.env.MAX_CODEX_REVISIONS);
  const humanReviewer = process.env.HUMAN_REVIEWER;
  const headSha = context.payload.pull_request.head.sha;
  const loadComments = () =>
    github.paginate(github.rest.issues.listComments, { owner, repo, issue_number, per_page: 100 });
  const comments = await loadComments();
  const revisions =
    context.payload.action === 'synchronize' &&
    context.payload.sender.login === CODEX_BOT_LOGIN
      ? await deriveRevision(comments, headSha, async (base, head) => {
          const comparison = await github.rest.repos.compareCommitsWithBasehead({
            owner,
            repo,
            basehead: `${base}...${head}`,
          });
          return comparison.data.status;
        })
      : 0;

  const initialMarker = `<!-- codex-review-loop:request:review:head:${headSha} -->`;
  if (!hasMarker(comments, initialMarker)) {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body:
        `${initialMarker}\n@codex review this PR. Report actionable P0/P1 findings and ` +
        'end the review body with the machine-readable verdict required by AGENTS.md.',
    });
  }

  let review;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { data: pull } = await github.rest.pulls.get({ owner, repo, pull_number: issue_number });
    if (pull.head.sha !== headSha) {
      core.info('A newer PR head superseded this run.');
      return;
    }
    review = selectReview(
      await github.paginate(github.rest.pulls.listReviews, {
        owner,
        repo,
        pull_number: issue_number,
        per_page: 100,
      }),
      headSha,
    );
    if (review) break;
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }

  const ensureLabel = async (name, color, description) => {
    try {
      await github.rest.issues.getLabel({ owner, repo, name });
    } catch (error) {
      if (error.status !== 404) throw error;
      await github.rest.issues.createLabel({ owner, repo, name, color, description });
    }
  };
  const replaceHandoffLabel = async (add, remove) => {
    await ensureLabel(...add);
    await github.rest.issues.addLabels({ owner, repo, issue_number, labels: [add[0]] });
    try {
      await github.rest.issues.removeLabel({ owner, repo, issue_number, name: remove });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  };
  const postOnce = async (marker, body) => {
    if (hasMarker(await loadComments(), marker)) {
      core.info(`Comment already exists: ${marker}`);
      return false;
    }
    await github.rest.issues.createComment({ owner, repo, issue_number, body: `${marker}\n${body}` });
    return true;
  };

  const outcome = planOutcome(review, revisions, maxRevisions);
  if (outcome.type === 'request') {
    const marker =
      `<!-- codex-review-loop:request:revision:${outcome.revision}:head:${headSha} -->`;
    await postOnce(
      marker,
      `@codex fix all actionable findings from your latest review. Keep the changes scoped, run the relevant tests, and push the fixes to this PR branch. Revision ${outcome.revision} of ${maxRevisions}.`,
    );
    return;
  }

  if (outcome.type === 'clean') {
    await resolveCodexThreads(github, owner, repo, issue_number);
  }

  const handoff = buildHandoff(outcome, humanReviewer, maxRevisions, headSha);
  await replaceHandoffLabel(handoff.add, handoff.remove);
  await postOnce(`<!-- codex-review-loop:${outcome.type}:head:${headSha} -->`, handoff.body);
};

module.exports = run;
module.exports.testables = {
  CODEX_BOT_LOGIN,
  buildHandoff,
  deriveRevision,
  hasMarker,
  parseVerdict,
  planOutcome,
  selectResolvableThreadIds,
  selectReview,
};
