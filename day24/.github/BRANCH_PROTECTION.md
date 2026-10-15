# NexoraAI Branch Protection Policy & Governance

This document outlines the branch protection rules, required CI/CD status checks, and peer review standards enforced on the `main` branch to guarantee production stability, code security, and zero downtime deployments.

---

## 1. Branch Protection Overview

The `main` branch represents the canonical, deployable state of NexoraAI. Direct pushes to `main` are strictly forbidden. All code modifications must arrive via Pull Requests that pass automated validation and human code review.

| Protection Rule | Setting | Purpose |
| :--- | :--- | :--- |
| **Require Pull Request** | Enabled (Min 1 Approval) | Guarantees peer review and architectural validation before merge. |
| **Dismiss Stale Approvals** | Enabled | Requires re-approval if new commits are pushed to an approved PR. |
| **Require Code Owner Review** | Enabled (`.github/CODEOWNERS`) | Ensures domain experts review changes to critical components. |
| **Require Status Checks to Pass** | Enabled (Strict Mode) | Verifies branch is up to date with `main` and passes all CI gates. |
| **Require Conversation Resolution** | Enabled | Ensures all reviewer comments, suggestions, and questions are resolved. |
| **Require Signed Commits** | Enabled | Cryptographically verifies author identity via GPG or SSH keys. |
| **Require Linear History** | Enabled (Squash & Merge) | Maintains a clean, bisectable git commit history without merge bubbles. |
| **Include Administrators** | Enabled | Enforces identical protection standards on repository admins. |

---

## 2. Required Status Checks (CI Gates)

Before the "Merge Pull Request" button becomes active, GitHub Actions must report green checkmarks for the following jobs defined in `.github/workflows/ci.yml`:

1. **`backend-ci` (Backend Lint & Pytest)**:
   - Ruff linting checks pass with zero violations.
   - 100% of Pytest backend unit & integration tests pass against live PostgreSQL 16 & Redis 7 service containers.
   - Coverage threshold met with automated XML report generation.

2. **`frontend-ci` (Frontend Typecheck & Vitest)**:
   - TypeScript compiler validation passes (`tsc --noEmit`).
   - All 49 Vitest unit and component integration tests pass.
   - Production Vite bundle builds without errors.

3. **`docker-build-push` (Docker Image Build Validation)**:
   - Multi-stage Dockerfiles compile and produce valid container layers using Docker Buildx.
   - No cache invalidation errors or dangling references.

---

## 3. Automated Configuration via GitHub CLI

Repository administrators can apply this policy directly to GitHub using the GitHub CLI (`gh`):

```bash
# Apply branch protection rules to main branch
gh api --method PUT repos/:owner/:repo/branches/main/protection \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Backend Lint & Pytest",
      "Frontend Typecheck & Vitest",
      "Docker Build & Publish"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF
```

---

## 4. Pull Request Workflow Checklist

When submitting a Pull Request to `main`:
- [ ] PR branch created from latest `main` (`git checkout -b feature/your-feature-name`).
- [ ] Local tests pass (`pytest` in backend, `npm run test:run` in frontend).
- [ ] No secret keys or `.env` files committed.
- [ ] Clear PR description referencing the Jira / GitHub issue ID.
- [ ] All automated CI checks report green.
- [ ] At least one code review approval obtained.
- [ ] PR merged using **Squash and Merge** with conventional commit format (e.g., `feat(devops): multi-stage docker compose orchestration`).
