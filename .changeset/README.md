# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It records intended version bumps so releases and changelogs are automated.

## Workflow

1. Make your code changes.
2. Run `pnpm changeset` and follow the prompts — pick which packages changed and whether each bump is `patch` / `minor` / `major`, and write a short summary. This creates a markdown file here.
3. Commit that file alongside your changes and open a PR.
4. When the PR merges to `main`, the **Release** GitHub Action opens (or updates) a "Version Packages" PR that applies the bumps and updates changelogs. Merging *that* PR publishes the changed packages to npm.

To publish manually instead: `pnpm version` (applies bumps) then `pnpm release` (builds + `changeset publish`).
