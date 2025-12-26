# Specification: Fix Build Errors and Prevent Future Linting Issues

## Overview

This task addresses two critical TypeScript/ESLint errors in `PromptActions.tsx` and `LayoutAnnotationTab.tsx` that are currently blocking production deployments on Vercel. Beyond fixing these immediate issues, we will implement a comprehensive linting infrastructure using Husky and lint-staged to enforce pre-commit ESLint checks, configure VS Code for automatic code fixes, and optionally establish GitHub Actions workflows for continuous integration linting. This multi-layered approach ensures code quality at every stage: during development (IDE auto-fix), before commits (pre-commit hooks), and during CI/CD pipeline execution.

## Workflow Type

**Type**: feature

**Rationale**: While this involves fixing bugs, the primary deliverable is implementing new development infrastructure (pre-commit hooks, CI/CD workflows, IDE configuration). This infrastructure improvement qualifies as a feature that enhances the development workflow and prevents future production failures.

## Task Scope

### Services Involved
- **main** (primary) - Next.js TypeScript application requiring linting fixes and infrastructure setup

### This Task Will:
- [x] Identify and fix the specific TypeScript/ESLint errors in `PromptActions.tsx`
- [x] Identify and fix the specific TypeScript/ESLint errors in `LayoutAnnotationTab.tsx`
- [x] Install and configure Husky for Git hooks management
- [x] Configure lint-staged to run ESLint on staged files before commits
- [x] Create or update `.vscode/settings.json` to enable ESLint auto-fix on file save
- [x] Verify pre-commit hooks block commits containing linting errors
- [x] (Optional) Create GitHub Actions workflow for automated linting in CI/CD pipeline
- [x] Document the new linting workflow for team members

### Out of Scope:
- Comprehensive refactoring of existing codebase to fix all linting warnings
- Modifying ESLint configuration rules (use existing .eslintrc)
- Setting up additional Git hooks beyond pre-commit (e.g., pre-push, commit-msg)
- Implementing TypeScript strict mode or changing compiler options
- Adding linting for other file types (CSS, YAML, JSON) beyond TypeScript/JavaScript

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Package Manager: npm
- Styling: Tailwind CSS
- State Management: Zustand
- E2E Testing: Playwright
- Existing Linting: ESLint (configured)

**Key Directories:**
- `src/` - Source code
- `tests/` - Test files

**Entry Point:** Next.js application root

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Development URL:** http://localhost:3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/components/PromptActions.tsx` | main | Fix TypeScript/ESLint error(s) blocking build |
| `src/components/LayoutAnnotationTab.tsx` | main | Fix TypeScript/ESLint error(s) blocking build |
| `package.json` | main | Add Husky and lint-staged dependencies; add prepare script and lint-staged configuration |
| `.vscode/settings.json` | main | Add/update ESLint auto-fix on save configuration |
| `.github/workflows/lint.yml` | main | (Optional) Create GitHub Actions workflow for CI linting |
| `.husky/pre-commit` | main | Create pre-commit hook to run lint-staged |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `.eslintrc.json` or `.eslintrc.js` | Existing ESLint configuration rules to understand what's being enforced |
| `tsconfig.json` | TypeScript compiler options to understand type checking strictness |
| `package.json` | Existing scripts and dependency patterns |
| Other component files in `src/components/` | Code style patterns for React components |

## Patterns to Follow

### ESLint Configuration Pattern

The project already has ESLint configured (evidenced by `@eslint/eslintrc` in dev dependencies). Follow the existing configuration without modification:

**Key Points:**
- Use existing ESLint rules - do not create new .eslintrc
- Fix errors to comply with current standards
- Ensure TypeScript types are properly defined

### Husky + lint-staged Pattern

Standard industry pattern for pre-commit hooks:

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

**Key Points:**
- `prepare` script runs automatically after `npm install`
- lint-staged only runs on staged files (fast)
- `--fix` flag auto-fixes what ESLint can repair
- Remaining errors block the commit

### VS Code Settings Pattern

Enable auto-fix on save for seamless developer experience:

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

**Key Points:**
- Auto-fix runs on every save
- Validates TypeScript and TSX files
- Reduces manual fix burden

## Requirements

### Functional Requirements

1. **Fix Blocking Build Errors**
   - Description: Resolve the specific TypeScript/ESLint errors in `PromptActions.tsx` and `LayoutAnnotationTab.tsx` that cause Vercel deployment failures
   - Acceptance: Vercel build completes successfully without errors in these files

2. **Pre-commit Hook Enforcement**
   - Description: Configure Husky and lint-staged to automatically run ESLint on staged files before allowing commits
   - Acceptance: Attempting to commit files with linting errors is blocked with clear error messages

3. **IDE Auto-fix Integration**
   - Description: Configure VS Code workspace settings to automatically fix ESLint issues on file save
   - Acceptance: Saving a TypeScript file in VS Code automatically applies ESLint fixes

4. **CI/CD Linting (Optional)**
   - Description: Create GitHub Actions workflow that runs ESLint on all TypeScript files on pull requests and pushes
   - Acceptance: GitHub Actions workflow runs and reports linting status

### Edge Cases

1. **Developer Without Husky Installed** - After cloning, `npm install` automatically runs `prepare` script to install hooks
2. **Skipping Hooks (Force Commit)** - Document that `git commit --no-verify` bypasses hooks (should only be used in emergencies)
3. **Non-VS Code Users** - Pre-commit hooks work regardless of IDE, but auto-fix on save is IDE-specific
4. **Partial Staging** - lint-staged only checks staged files, not entire codebase
5. **Hook Installation on Windows** - Ensure Husky works correctly on Windows file systems

## Implementation Notes

### DO
- Run `npm run lint` or `npx eslint .` first to identify all errors in the two target files
- Fix errors by understanding root cause (missing types, unused vars, etc.) not just disabling rules
- Test pre-commit hooks locally before pushing by staging files with intentional errors
- Add `.husky/` directory to version control (but not `.husky/_/` which is auto-generated)
- Use `npx husky install` to initialize Husky after installation
- Document the new workflow in project README or CONTRIBUTING.md
- Verify GitHub Actions workflow runs successfully on a test branch before merging

### DON'T
- Use `// eslint-disable-next-line` comments to suppress errors (fix them properly)
- Modify ESLint rules to be more permissive just to make errors go away
- Forget to run `npm install` after adding Husky to ensure hooks are installed
- Add heavy linting operations that slow down commits (lint-staged should be fast)
- Skip testing the pre-commit hook - verify it actually blocks bad commits
- Commit `.husky/_/` directory (it's auto-generated and should be in .gitignore)

## Development Environment

### Start Services

```bash
# Install dependencies (runs prepare script to set up Husky)
npm install

# Start development server
npm run dev
```

### Service URLs
- Next.js Application: http://localhost:3000

### Required Environment Variables

No additional environment variables required for this task. Existing `.env.local` configuration remains unchanged.

### Useful Commands

```bash
# Check for linting errors
npm run lint

# Run ESLint with auto-fix
npx eslint --fix "src/**/*.{ts,tsx}"

# Manually run lint-staged (for testing)
npx lint-staged

# Install Husky hooks manually
npx husky install

# Test pre-commit hook (stage files and attempt commit)
git add .
git commit -m "Test commit"
```

## Success Criteria

The task is complete when:

1. [x] Both `PromptActions.tsx` and `LayoutAnnotationTab.tsx` have zero ESLint/TypeScript errors
2. [x] Vercel build succeeds without linting errors
3. [x] Husky is installed and `prepare` script exists in package.json
4. [x] lint-staged is configured in package.json to run ESLint on `.ts` and `.tsx` files
5. [x] Pre-commit hook at `.husky/pre-commit` runs lint-staged
6. [x] Attempting to commit files with linting errors is blocked
7. [x] `.vscode/settings.json` enables ESLint auto-fix on save
8. [x] (Optional) GitHub Actions workflow file exists and runs successfully
9. [x] No console errors in development environment
10. [x] Existing tests still pass
11. [x] Documentation added for new linting workflow

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| ESLint Configuration Test | N/A | Run `npm run lint` and verify zero errors |
| TypeScript Compilation Test | N/A | Run `npx tsc --noEmit` and verify zero type errors |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Pre-commit Hook Integration | Git + Husky + lint-staged | Stage files with intentional errors and verify commit is blocked |
| VS Code Integration | IDE + ESLint | Open TypeScript file with errors, save it, and verify auto-fixes are applied |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Developer Workflow | 1. Clone repo 2. Run `npm install` 3. Edit file with linting error 4. Save file 5. Stage and commit | Auto-fix on save works; pre-commit hook blocks commit if errors remain |
| CI/CD Workflow | 1. Create PR with intentional linting error 2. Push to GitHub 3. Check Actions tab | GitHub Actions workflow fails and reports linting errors (if implemented) |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| PromptActions Component | Any page using PromptActions | Component renders without errors; functionality unchanged |
| LayoutAnnotationTab Component | Any page using LayoutAnnotationTab | Component renders without errors; functionality unchanged |
| Development Console | `http://localhost:3000` | No console errors related to fixed files |

### Build Verification

| Check | Command | Expected |
|-------|---------|----------|
| Local Build | `npm run build` | Build succeeds with exit code 0 |
| Vercel Build | Deploy to Vercel | Build succeeds in Vercel dashboard |
| Linting Check | `npm run lint` | Zero errors, zero warnings (or existing warnings unchanged) |
| Type Check | `npx tsc --noEmit` | Zero type errors |

### Git Hooks Verification

| Check | Command | Expected |
|-------|---------|----------|
| Husky Installation | `ls .husky/pre-commit` | File exists and is executable |
| Hook Execution | Stage file with error and run `git commit -m "test"` | Commit blocked with ESLint error message |
| Hook Bypass | `git commit --no-verify -m "test"` | Commit succeeds (bypass works for emergencies) |

### VS Code Configuration Verification

| Check | File | Expected |
|-------|------|----------|
| Settings File Exists | `.vscode/settings.json` | File exists with ESLint auto-fix configuration |
| Auto-fix Works | Open .tsx file, introduce error, save | Error is auto-fixed on save (if fixable) |

### GitHub Actions Verification (Optional)

| Check | Location | Expected |
|-------|----------|----------|
| Workflow File Exists | `.github/workflows/lint.yml` | File exists with proper ESLint job configuration |
| Workflow Runs | GitHub Actions tab | Workflow triggers on push/PR and runs ESLint successfully |
| Workflow Reports Errors | Create PR with errors | Workflow fails and displays error messages in Actions log |

### QA Sign-off Requirements

- [x] All unit tests pass (linting and type checking)
- [x] All integration tests pass (pre-commit hooks work correctly)
- [x] All E2E tests pass (developer workflow functions end-to-end)
- [x] Browser verification complete (components render without errors)
- [x] Build verification complete (local and Vercel builds succeed)
- [x] Git hooks verified (pre-commit blocks bad commits)
- [x] VS Code configuration verified (auto-fix on save works)
- [x] GitHub Actions verified (if implemented)
- [x] No regressions in existing functionality
- [x] Code follows established TypeScript and React patterns
- [x] No security vulnerabilities introduced
- [x] Documentation updated with new linting workflow
- [x] Team members can clone repo and have hooks automatically installed

### Specific Files to Test

**PromptActions.tsx**
- Verify specific error is fixed
- Verify component renders correctly
- Verify component functionality unchanged

**LayoutAnnotationTab.tsx**
- Verify specific error is fixed
- Verify component renders correctly
- Verify component functionality unchanged

**package.json**
- Verify `husky` and `lint-staged` in devDependencies
- Verify `prepare` script: `"prepare": "husky install"`
- Verify `lint-staged` configuration exists

**.husky/pre-commit**
- Verify file exists
- Verify contains `npx lint-staged`
- Verify is executable

**.vscode/settings.json**
- Verify ESLint auto-fix configuration
- Verify TypeScript file validation

**.github/workflows/lint.yml** (if implemented)
- Verify runs on pull_request and push events
- Verify runs ESLint on TypeScript files
- Verify reports errors correctly
