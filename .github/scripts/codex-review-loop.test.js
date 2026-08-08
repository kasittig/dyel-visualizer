const assert = require('node:assert/strict');
const { test } = require('node:test');
const { testables } = require('./codex-review-loop');

const sha = (digit) => digit.repeat(40);
const verdict = (actionable, severity = null, count = 0) =>
  `<!-- codex-review-verdict: ${JSON.stringify({ actionable, highest_severity: severity, finding_count: count })} -->`;
const review = (body, commit = sha('a'), login = testables.CODEX_BOT_LOGIN) => ({
  body,
  commit_id: commit,
  user: { login },
});

test('selectReview ignores stale, unrelated, and malformed bot reviews', () => {
  assert.equal(
    testables.selectReview(
      [
        review(verdict(false), sha('b')),
        review(verdict(false), sha('a'), 'another-bot[bot]'),
        review('environment setup required'),
        review(verdict(true, 'P1', 1)),
      ],
      sha('a'),
    )?.body,
    verdict(true, 'P1', 1),
  );
});

test('deriveRevision survives rapid pushes by using request ancestry', async () => {
  const comments = [
    {
      user: { login: 'github-actions[bot]' },
      body: `<!-- codex-review-loop:request:revision:2:head:${sha('a')} -->`,
    },
  ];
  assert.equal(
    await testables.deriveRevision(comments, sha('c'), async (base) =>
      base === sha('a') ? 'ahead' : 'diverged',
    ),
    2,
  );
});

test('request markers make replayed workflow events idempotent', () => {
  const marker = `<!-- codex-review-loop:request:revision:1:head:${sha('a')} -->`;
  assert.equal(
    testables.hasMarker([{ user: { login: 'github-actions[bot]' }, body: marker }], marker),
    true,
  );
  assert.equal(testables.hasMarker([{ user: { login: 'someone' }, body: marker }], marker), false);
});

test('selectResolvableThreadIds returns only unresolved Codex-authored threads', () => {
  assert.deepEqual(
    testables.selectResolvableThreadIds([
      {
        id: 'codex-open',
        isResolved: false,
        comments: { nodes: [{ author: { login: testables.CODEX_BOT_LOGIN } }] },
      },
      {
        id: 'codex-resolved',
        isResolved: true,
        comments: { nodes: [{ author: { login: testables.CODEX_BOT_LOGIN } }] },
      },
      {
        id: 'human-open',
        isResolved: false,
        comments: { nodes: [{ author: { login: 'kasittig' } }] },
      },
    ]),
    ['codex-open'],
  );
});

test('plans clean, actionable, capped, timeout, and malformed outcomes', () => {
  const cases = [
    ['clean', review(verdict(false)), 0, 'clean'],
    ['actionable', review(verdict(true, 'P1', 1)), 0, 'request'],
    ['capped', review(verdict(true, 'P0', 2)), 3, 'cap'],
    ['timeout', undefined, 0, 'timeout'],
    ['malformed', review('not a verdict'), 0, 'invalid'],
  ];
  for (const [name, candidate, revisions, expected] of cases) {
    assert.equal(testables.planOutcome(candidate, revisions, 3).type, expected, name);
  }
});

test('builds the timeout handoff without requiring a verdict', () => {
  assert.deepEqual(testables.buildHandoff({ type: 'timeout' }, 'kasittig', 3, sha('a')), {
    add: ['human-review-needed', 'd93f0b', 'Codex review timed out; human attention needed'],
    remove: 'human-review-ready',
    body: '@kasittig Codex did not finish reviewing aaaaaaa within 30 minutes. The automation stopped for manual review.',
  });
});
