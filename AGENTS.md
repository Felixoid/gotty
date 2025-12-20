# Project

Read the @README.md

# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

When manually testing this project, run the server using the `background-job` MCP; and you can use a web browser via the `chrome-devtools` MCP.

## Important Learnings from Recent Refactoring

**Directory Structure & Go Modules:**
- When moving Go code to `pkg/` structure, ALWAYS check `.gitignore` - it may ignore files you need (e.g., `app` was ignored but `pkg/app/` wasn't)
- Use `go:embed` for static assets - place them in `pkg/embed/static/` with embed directive in `pkg/embed/embed.go`
- When renaming modules (e.g., `yudai/gotty` → `jpillora/gotty`), update ALL import paths in Go files
- Update documentation references: README badges, links, `go get` commands, homebrew taps

**CI/CD & Releases:**
- Goreleaser config must point to correct main package path (e.g., `main: ./pkg/app`)
- Version bumping: Use minor version (2.1.0 → 2.2.0) for major refactors, patch for small fixes
- Test builds after refactoring: `go build ./pkg/app` and `make gotty`
- Clean up accidentally committed binaries: `git rm <file>` and recommit

**Build System:**
- Makefile uses `./pkg/app` as build target after refactor
- Static assets built to `pkg/embed/static/` and embedded via `go:embed`
- Frontend built via webpack in `pkg/embed/static/js/`

**Repository Maintenance:**
- Watch for accidentally committed binaries (check with `git rev-list --objects --all | git cat-file --batch-check | sort -k3nr | head -10`)
- Remove binaries from history using: `git filter-repo --path app --invert-paths` (requires git-filter-repo)
- Always check `.gitignore` includes build artifacts: `gotty`, `pkg/embed/static`, etc.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

