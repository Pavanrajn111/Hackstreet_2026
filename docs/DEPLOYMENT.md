# Production Deployment: Render and Vercel

This repository deploys its FastAPI backend to Render and React/Vite frontend to
Vercel. Render's service root must remain the repository root so the backend can
import the sibling `ml/` package. Configuration examples contain placeholders,
not deployable credentials.

## 1. Prepare GitHub

1. Push the repository with `render.yaml`, `frontend/vercel.json`, and both
   app-specific `.env.example` files.
2. Verify secrets are ignored and only example templates are tracked:

   ```powershell
   git check-ignore -v .env backend/.env frontend/.env
   git check-ignore -v .env.example backend/.env.example frontend/.env.example
   git ls-files | Select-String '(^|/)\.env($|\.)'
   ```

   Real environment paths should be ignored; example templates should not be.
   If real environment files are already tracked, untrack without deleting local
   copies, then rotate any exposed credentials:

   ```powershell
   git rm --cached --ignore-unmatch .env backend/.env frontend/.env
   ```

3. This checkout currently contains **no tracked crop-planner `.joblib` files**.
   The irrigation bundle is disabled, and model binaries are intentionally
   ignored. Do not copy irrigation models into the crop-planner directory. If
   crop-planner inference is needed, obtain and verify its actual trained
   artifacts before committing them under `ml/crop_planner/`. The ignore rules
   allow those specific files:

   ```powershell
   git ls-files 'ml/crop_planner/**/*.joblib'
   ```

   Until then, crop-planner ML deployment is blocked; deterministic FAO-56
   recommendations remain the fallback.

   The irrigation adapter is wired into the recommendation route, but the
   production model remains disabled. The supplied irrigation bundle metadata
   pins XGBoost 3.4.1, which requires Python 3.12 or newer; the current Render
   runtime is Python 3.11.11. Keep ML disabled until the actual artifacts and
   their supported runtime are available together and inference is verified.

## 2. Deploy the backend to Render

1. Connect the GitHub repository to Render and create a Web Service (or deploy
   the checked-in Blueprint).
2. Keep the **Root Directory** at the repository root (`.`), not `backend/`.
   Confirm:

   | Setting | Value |
   | --- | --- |
   | Runtime | Python |
   | Root Directory | `.` |
   | Build Command | `pip install -r backend/requirements.txt` |
   | Start Command | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
   | Health Check Path | `/health` |
   | Python | `3.11.11` from `.python-version` |

   The start command runs from `backend/`, listens on all interfaces and uses
   Render's `$PORT`. The route module resolves the root-level `ml/` directory.
   The service does not depend on a developer's local `.env`.

3. Set these values in the Render Dashboard:

   | Key | Value |
   | --- | --- |
   | `APP_ENV` | `production` |
   | `DATABASE_URL` | `sqlite:////var/data/irrigation.db` |
   | `CORS_ORIGINS` | Exact Vercel production origin, e.g. `https://<your-vercel-domain>` |
   | `ML_MODEL_ENABLED` | `false` |
   | `ML_MODEL_DIR` | `ml/models/models` |
   | `WEATHER_CACHE_TTL_SECONDS` | `3600` |
   | `WEATHER_API_TIMEOUT_SECONDS` | `8.0` |
   | `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com/v1/forecast` |
   | `GEMINI_API_KEY` | Optional real key, only if configured for use |
   | `GEMINI_MODEL` | `gemini-2.0-flash` |

   `DATABASE_URL`, `CORS_ORIGINS`, and `GEMINI_API_KEY` use unsynchronized
   Blueprint variables and must be entered in the Dashboard. `CORS_ORIGINS` is a
   comma-separated list of exact origins. Add exact preview origins if needed;
   never use an unrestricted wildcard with credentials.

4. **SQLite persistence must be configured separately.** Attach a Render
   persistent disk on a plan that supports it and mount it at `/var/data`. The
   application creates the SQLite parent directory when possible, enables WAL
   and a 30-second busy timeout, and reports initialization errors if the disk is
   not writable. `/health` performs a database query and reports failure instead
   of claiming the database is ready.

   Render's default filesystem is ephemeral. Without a supported persistent
   disk, SQLite data may be lost on redeploy or instance replacement; that is
   appropriate only for temporary demonstrations.

5. After deploy, verify the Render URLs:

   ```powershell
   Invoke-RestMethod https://<your-render-service>.onrender.com/health
   Invoke-WebRequest https://<your-render-service>.onrender.com/docs
   ```

   The health response should include `status: healthy` and
   `database: sqlite_ready`. Replace placeholders with the actual Render URL.

## 3. Deploy the frontend to Vercel

1. Connect the same GitHub repository in Vercel.
2. Set **Root Directory** to `frontend` and **Framework Preset** to Vite.
3. Use:

   | Setting | Value |
   | --- | --- |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

   `frontend/package-lock.json` exists, so `npm ci` is preferred for reproducible
   installs. `frontend/vercel.json` rewrites requests to `index.html`; the
   rewrite does not create React Router routes missing from the source.

4. Configure Vercel Production (and Preview, if needed) environment variables:

   | Key | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | Render origin only, with no `/api` suffix |
   | `VITE_USE_MOCK_DATA` | `false` |
   | `VITE_DEFAULT_LANGUAGE` | `en` |
   | `VITE_SUPABASE_URL` | Public Supabase project URL, required for authentication |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Public Supabase publishable key, required for authentication |

   Example shape: `https://<your-render-service>.onrender.com`. The frontend
   appends `/api/...` to this base. Vite variables are public in the browser
   bundle; never put backend secrets, a Gemini key, or a Supabase service-role
   secret in a `VITE_` variable.

5. Vercel environment variables are applied at **build time**; redeploy after
   changing them. If `VITE_API_BASE_URL` is missing in production, the frontend
   logs a configuration error and does not fall back to localhost. Local
   development still defaults to `http://localhost:8000`.

6. Demo mode remains user-selectable. The saved local-storage key
   `agr002_use_mock=true` overrides the environment's initial setting. To test
   production live mode, use the app's mode selector or run this in the browser
   console:

   ```javascript
   localStorage.removeItem('agr002_use_mock');
   location.reload();
   ```

7. Once the actual Vercel domain is known, set it in Render's
   `CORS_ORIGINS` and redeploy Render. Add exact preview origins as required;
   do not invent the domain or allow every origin.

## 4. Supabase authentication UI

The frontend uses Supabase for sign-in, registration, email recovery, password
reset, and sign-out. Authentication routes show a clear configuration error
until `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` contain valid
project values. Obtain these public values from the Supabase Dashboard; never
put a service-role or secret key in a `VITE_` variable.

In Supabase Authentication settings, allow the deployed site's origin and these
redirect paths:

- `/login` for email confirmation after registration.
- `/reset-password` for password recovery.

Set the same public values in Vercel Production and Preview environments as
needed, then redeploy because Vite reads them at build time.

**This is authentication UI only.** The FastAPI endpoints do not validate
Supabase JWTs, and farm data is not scoped to authenticated users. Do not treat
sign-in as API or data protection.

## 5. Community Water showcase

`/app/community-water` is a static hackathon showcase. Names, availability,
volumes, locations, and activity are illustrative, not live community data.
The request form demonstrates a local browser-only preview; it does not contact
an API or persist or share requests. Refreshing or leaving the page clears the
preview.

## 6. Verify the deployed frontend

1. Open the Vercel site with demo mode disabled, including any saved local
   storage override.
2. In Developer Tools → **Network**, verify API calls use the configured Render
   origin and the existing `/api/...` endpoint paths.
3. Check responses and the browser console for CORS or missing-configuration
   errors. Test Render `/health` and `/docs` directly if API calls fail.

Routes declared in `frontend/src/App.jsx` are `/`, `/login`, `/register`,
`/recover`, `/reset-password`, `/app`, `/app/setup`, `/app/schedule`,
`/app/history`, `/app/intelligence`, `/app/community-water`, and `/app/profile`,
plus redirects from `/dashboard`, `/setup`, `/schedule`, `/history`, and
`/community-water`. Vercel's rewrite returns the SPA shell but cannot add
application routes.

## 7. Local deployment-readiness checks

From the repository root:

```powershell
pip install -r backend/requirements.txt
Set-Location backend
pytest tests -q
python -c "from app.main import app; print(app.title)"
Set-Location ..
npm --prefix frontend ci
npm --prefix frontend run build
```

Validate the configuration and ignore behavior:

```powershell
python -c "import yaml; yaml.safe_load(open('render.yaml', encoding='utf-8')); print('render.yaml: valid')"
python -c "import json; json.load(open('frontend/vercel.json', encoding='utf-8')); print('frontend/vercel.json: valid')"
Get-Content .python-version
git check-ignore -v .env backend/.env frontend/.env
git check-ignore -v .env.example backend/.env.example frontend/.env.example
git ls-files | Select-String '(^|/)\.env($|\.)'
```

If PyYAML is absent, use Render's Blueprint validation rather than adding a
project dependency. These checks do not claim that a cloud deployment succeeded.

## 8. Troubleshooting

- **Render cannot import `app`:** Keep Root Directory at `.` and retain `cd
  backend` in the start command.
- **Port or health-check failure:** Use `--host 0.0.0.0 --port $PORT` and health
  path `/health`.
- **SQLite data disappears:** Attach a supported persistent disk at `/var/data`;
  the default filesystem is not persistent.
- **Database permission/startup failure:** Verify the disk mount and write
  access, and use `sqlite:////var/data/irrigation.db`.
- **Browser CORS failure:** Add the exact Vercel origin to Render's
  comma-separated `CORS_ORIGINS` and redeploy.
- **Wrong API URL:** Set `VITE_API_BASE_URL` to the Render origin only and
  rebuild/redeploy Vercel.
- **Demo data still appears:** Clear `agr002_use_mock` or switch to live mode.
- **Direct navigation shows no page:** The rewrite serves `index.html`, but the
  path must also be declared in React Router.
- **ML does not run:** This is intentional while `ML_MODEL_ENABLED=false` or
  required model artifacts/dependencies are unavailable. The irrigation engine
  continues with deterministic FAO-56 recommendations. Crop-planner artifacts
  are not currently tracked in this repository.
