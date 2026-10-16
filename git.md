# Git workflow
- Remote is `origin` on GitHub. Never commit or push directly to `main`.
- At the start of each phase/task, create a branch: `phase-N-short-name` or `feat/short-name`.
- Commit when a logical unit of work is complete and its tests pass (a working chunk, not every file edit). Use Conventional Commits (feat:, fix:, test:, docs:, chore:) with specific, descriptive messages.
- Push the branch after each commit.
- Never commit .env, secrets, tokens, vendor/, node_modules/. Run `git status` before every commit.
- When the phase's exit gate passes, push the branch and open a PR with `gh pr create --base main`, including the checklist and test results, then stop. Never merge it yourself.
- Never force-push or rewrite history. If a git command fails, report the error.
