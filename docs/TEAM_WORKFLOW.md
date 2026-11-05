# AGR002 Smart Irrigation — Team Workflow Guide

Welcome to the team! This document outlines our collaboration practices, branching strategy, code review process, and file ownership boundaries to ensure smooth hackathon development without merge conflicts.

---

## 1. Team Roles & Ownership Boundaries

To avoid editing the same files simultaneously, our project is partitioned by directory boundaries:

| Role | Teammate | Directory Boundary | Primary Focus |
| :--- | :--- | :--- | :--- |
| **Frontend Engineer** | Teammate A | `frontend/src/` | UI/UX, charts, mobile layout, multilingual strings |
| **Backend Engineer** | Teammate B | `backend/app/` | FastAPI endpoints, FAO-56 logic, SQLite database |
| **ML Engineer** | Teammate C | `ml/` | Training scripts, model export, feature pipeline |
| **Integration / Lead** | Admin / Owner | `shared/`, `docs/`, root | Shared contracts, testing, git merges, repo releases |

### Golden Rule of File Ownership
- **Never edit another teammate's domain** without syncing on your team communication channel first.
- If backend changes affect frontend, update and approve changes in `shared/api-contract/` **first** before writing code.

---

## 2. Git Branching Strategy

Our repository uses a simple feature-branch workflow:

- `main`: Production-ready code only. Never commit or push directly to `main`.
- `develop`: Integration branch where feature branches merge.
- `feature/<name>`: Dedicated work branches.

### Naming Conventions
- `feature/frontend-charts`
- `feature/backend-open-meteo`
- `feature/ml-model-pipeline`
- `fix/schedule-date-format`

---

## 3. Step-by-Step Daily Workflow

### Step 1: Sync with Latest Upstream
Before starting work each morning or after lunch:
```powershell
git checkout main
git pull origin main
```

### Step 2: Create a Feature Branch
```powershell
git checkout -b feature/frontend-weather-card
```

### Step 3: Atomic Commits with Conventional Messages
Keep commits small and focused. Use conventional prefixes:
- `feat:` for new capabilities
- `fix:` for bug fixes
- `docs:` for documentation updates
- `test:` for adding or updating unit tests

```powershell
git add frontend/src/components/WeatherPanel.jsx
git commit -m "feat(frontend): add rainfall warning chip to weather panel"
```

### Step 4: Rebase and Push
Before pushing your branch, rebase on the latest `main`:
```powershell
git fetch origin
git rebase origin/main
git push -u origin feature/frontend-weather-card
```

### Step 5: Open a Pull Request (PR)
- Open a PR targeting `main` (or `develop`).
- Include a 2-3 sentence summary of what changed and a screenshot (for UI PRs).
- Tag at least one teammate to review.
- Squash and merge once approved and tests pass.

---

## 4. How to Avoid Merge Conflicts

1. **Strict Directory Isolation:** Keep frontend work in `frontend/`, backend in `backend/`, and ML in `ml/`.
2. **Never commit generated files:** Always keep `node_modules/`, `.venv/`, `.db` files, and `.env` files in `.gitignore`.
3. **Pull often:** Running `git pull origin main` multiple times a day prevents long-lived divergences.
4. **Communicate on Schema Changes:** If an API payload changes, both frontend and backend devs must agree on the `shared/api-contract/` JSON first.
