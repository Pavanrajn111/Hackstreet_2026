# AGR002 Smart Irrigation — Production Deployment & Handoff Guide

This document provides exact instructions for deploying the **AGR002 Smart Irrigation & Water Management** platform to production environments, configuring CORS, managing environment variables, and handing off between teammates.

---

## 1. Architecture Overview

```text
[ Farmer's Mobile Browser / PWA ]
              │
              ▼ HTTPS
[ Frontend: React + Vite Static SPA ] (Vercel / Netlify / Cloudflare Pages)
              │
              ▼ REST API (JSON)
[ Backend: FastAPI on Uvicorn ] (Railway / Render / Linux VPS)
        ├── SQLite / PostgreSQL Database (Audit records & farm logs)
        ├── Open-Meteo Agro-Weather API (Live ET0, Rain, Temp, Probabilities)
        └── ML Inference Adapter (Safe deterministic fallback)
```

---

## 2. Backend Deployment

### Option A: Railway / Render (Container or Python Native)
1. **Root Directory:** Set root to `backend/`.
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables:**
   ```ini
   APP_ENV=production
   BACKEND_HOST=0.0.0.0
   BACKEND_PORT=8000
   DATABASE_URL=sqlite:///./irrigation.db
   CORS_ORIGINS=https://your-frontend-app.vercel.app,http://localhost:5173
   ML_MODEL_ENABLED=false
   ```

### Option B: Linux Virtual Server (Ubuntu / Debian with systemd)
```bash
cd /opt/AGR002-Smart-Irrigation/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Run as service with systemd and reverse proxy with Nginx
```

---

## 3. Frontend Deployment (Vercel / Netlify)

1. **Root Directory:** `frontend/`
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. **Environment Variables:**
   ```ini
   VITE_API_BASE_URL=https://your-backend-api.railway.app
   VITE_USE_MOCK_DATA=false
   VITE_DEFAULT_LANGUAGE=en
   ```

---

## 4. Production CORS Configuration

By default, the backend allows local development ports. For production:
Set the `CORS_ORIGINS` environment variable in your production host:
```ini
CORS_ORIGINS=https://smart-irrigation.vercel.app,https://my-farm.org
```
The FastAPI middleware automatically splits this comma-separated string into permitted origins.

---

## 5. Security & Secret Management

- **Zero API Key Leakage:** Open-Meteo is open-access and requires no secret keys.
- **Git Hygiene:** Never commit `.env`, `.venv/`, `node_modules/`, `irrigation.db`, or raw binary `.joblib` files to GitHub.
- **Model Deserialization:** The backend validates feature shapes and output ranges ($0\text{--}100\text{ mm}$) to ensure unverified model weights cannot crash the application.

---

## 6. Known Limitations & Hackathon Boundaries

1. **Agronomic Scope:** FAO-56 Penman-Monteith single-coefficient equations provide generalized guidance. Local micro-climates, soil compaction, and salinization require physical ground-truth soil sensors for certified field use.
2. **Database:** SQLite is used for zero-configuration hackathon deployment. For enterprise multi-tenant concurrency, transition `DATABASE_URL` to PostgreSQL.
3. **Offline Mode:** The frontend caches the last recommendation and farm profile in `localStorage` and provides an offline banner when disconnected.

---

## 7. Database Management, Backups, and Restores

The backend uses SQLite configured with **Write-Ahead Logging (WAL mode)**, a 5000 ms busy timeout, and foreign key enforcement to ensure concurrent read/write stability.

### Automated Backups
To create an atomic, integrity-verified online backup:
```bash
python backend/scripts/backup_db.py --keep 5
```
Options:
- `--dir <path>`: Directory to save backups (defaults to `backend/backups/`).
- `--keep <N>`: Retain latest N backup snapshots and automatically rotate older ones (default: 5).

### Safe Database Restores
To restore from the latest backup (or a specified backup):
```bash
# Restore latest available backup
python backend/scripts/restore_db.py

# Restore a specific backup snapshot
python backend/scripts/restore_db.py --file backend/backups/irrigation_backup_20261105_222618.db
```
Safety features:
1. Validates `PRAGMA integrity_check` on the backup snapshot *before* touching the target database.
2. Automatically creates a safety pre-restore snapshot (`.pre_restore_<timestamp>`) of the live database before overwriting.
3. Re-verifies integrity on the restored destination file.
