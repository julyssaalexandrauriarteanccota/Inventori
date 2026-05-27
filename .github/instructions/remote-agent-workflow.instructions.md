---
description: "Use when coordinating a remote AI agent workflow on GitHub (push/pull, no secrets, branch workflow)."
applyTo: "**"
---

# Remote Agent Workflow (GitHub)

- Push current work before granting remote agent access; never include secrets or credentials.
- The agent works on its own branch and makes its own commits.
- Review and merge the branch; do not allow force-pushes to main.
- Sync locally with `git pull origin <branch>` instead of downloading a zip.
- Do not delete or overwrite unrelated files without explicit approval.

## References

- Repo overview: [AGENTS.md](../../AGENTS.md)
