## What changes and why

<!-- One or two sentences. Link the issue: Closes #123 -->

## Risk

- [ ] Normal change
- [ ] High risk (auth, credentials, permissions boundary, destructive migration, breaking contract, release/CI security): describe trust boundary and rollback below

## Evidence

- [ ] Bug fix: a test that fails before the fix (red) and passes after (green); paste both results
- [ ] `npm run check` result (code changes): <!-- rc and last line -->
- [ ] `./test.sh` result, or the specific test files run: <!-- rc and last line -->
- [ ] Checks not run or only verified in CI: <!-- list, or "none" -->

## Residual risk and rollback

<!-- What could still go wrong, and how to undo or forward-fix it. "None" is a valid answer. -->

## Checklist

- [ ] Docs updated where behavior, configuration or a contract changed
- [ ] No secrets, credentials, personal identifiers or absolute home paths in the diff (gitleaks runs in the pre-commit hook and in CI)
- [ ] New dependencies verified (exact pin, maintainer, license, lockfile diff and `install-lock`)
- [ ] Workflow changes: actions pinned to full SHAs, minimal `permissions:`, no untrusted `${{ }}` in `run:`
- [ ] Breaking change marked with `!` in the title and described above
- [ ] AI assistance disclosed (`Co-Authored-By:` or here), if any
