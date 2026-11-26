# Project rules (read by every collaborator's Claude)

Learning project: three people, each with their own Claude, working on one repo at the same time.

- Read `Spec.md` (the only spec) before starting. Build only what it describes; propose spec changes in a PR.
- Take a task from GitHub Issues and assign yourself first, so two people never do the same task.
- Never commit to `main` (it is protected). Pull `main`, work on a branch named `<github-user>/<topic>`, open a PR.
- Keep PRs small and focused on one issue, to avoid merge conflicts.
- Never commit secrets (Dynatrace tokens, tenant URLs, passwords). Keep them in `.env`, which git ignores. The repo is public.
