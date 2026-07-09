---
name: handoff
description: Use when the user wants to "handoff", "wrap up", "clear context", or runs /handoff to save session progress and outstanding TODOs to a file.
allowed-tools: Write
---

Write a handoff summary of the current conversation so a fresh agent session can seamlessly continue the work.
Make your summary as concise as possible. Summarize historical information. Do not include information that won't be
needed to complete future steps.

Follow these steps exactly:

First, ensure that HANDOFF.md is up to date. Then,

1. Create a `HANDOFF.md` file inside the root of the current working directory (or update the existing doc, if one exists).
2. Structure the file with these markdown sections:
   - **Context:** A high-level description of the overarching goal or project we are tackling.
   - **Progress Overview:** A concise summary of what we have successfully built, fixed, or investigated.
   - **Decisions Made & Rationale:** Key technical or architectural choices made during this session, and why.
   - **Open TODOs:** A clear, prioritized, bulleted list of the exact next steps, unresolved bugs, or tasks.
   - **Files Touched:** A clean list of paths to files we modified or created.
   - **Suggested Next Skills:** A list of skills or commands the next session agent should immediately invoke.
3. Keep the tone technical, objective, and plain-spoken so the next agent can process it instantly.
4. Do not include sensitive information like passwords, API keys, or credentials.
5. Make a commit with the changes that you've made this session. If the base branch is a feature branch that has not merged, make the commit on the feature branch. Otherwise, make the commit off of an updated copy of main.
6. Once the file is written and the commit is made, notify the user that the handoff file is ready and that they can safely clear the session context using `/clear`.
