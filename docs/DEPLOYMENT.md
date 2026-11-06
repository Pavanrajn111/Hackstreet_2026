# AGR002 Production Deployment Guide

This guide covers deploying the FastAPI backend to Render and the React/Vite
single-page application to Vercel. It describes the repository's current
configuration and limitations; it does not imply that a cloud deployment has
already been created.

## Deployment overview

| Component | Host | Repository configuration |
| --- | --- | --- |
| FastAPI API | Render | `render.yaml` |
| React/Vite frontend | Vercel | `frontend/vercel.json` |
| SQLite database | Render persistent disk | Configure the disk in Render |
| Supabase | Supabase project | Auth UI configuration in Vercel |
| Gemini chat | Google AI API, called by backend | Secret configuration in Render only |

Render must build from the repository root. The backend imports the sibling
`ml/` package, so setting its root directory to `backend/` will break the
deployment. Vercel should use `frontend/` as its root directory.

## Before deploying

1. Push the intended changes to the Git branch connected to Render and Vercel.
2. Confirm `.env`, `backend/.env`, and `frontend/.env` are not tracked. Keep
   secrets in the hosting dashboards, not in source files or commits.
3. If an API key has been shared in chat, committed, or otherwise exposed,
   revoke it and create a replacement before deployment.
4. Have a stable Vercel production domain ready before finalizing Render's
   `CORS_ORIGINS` value.

The checked-in `.env.example` files contain placeholders for local development.
They are not production credentials. Do not copy real values into an example
file.

## 1. Deploy the backend to Render

### Create the service

In Render, create a Web Service from this GitHub repository, or use the
repository's `render.yaml` Blueprint. Configure the service as follows:

| Setting | Value |
| --- | --- |
| Runtime | Python |
| Root Directory | `.` (repository root) |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Python version | `3.11.11`, from `.python-version` |

The start command changes into `backend/`, listens on all interfaces, and uses
Render's assigned port. Do not replace `$PORT` with a fixed port.

### Set backend environment variables

Set the following in Render's Environment settings. The Blueprint supplies
defaults for non-secret settings and marks `DATABASE_URL`, `CORS_ORIGINS`, and
`GEMINI_API_KEY` as values that must be set in the Dashboard.

| Variable | Production value |
| --- | --- |
| `APP_ENV` | `production` |
| `DATABASE_URL` | `sqlite:////var/data/irrigation.db` |
| `CORS_ORIGINS` | Your exact Vercel origin, for example `https://your-app.vercel.app` |
| `ML_MODEL_ENABLED` | `false` |
| `ML_MODEL_DIR` | `ml/models/models` |
| `WEATHER_CACHE_TTL_SECONDS` | `3600` |
| `WEATHER_API_TIMEOUT_SECONDS` | `8.0` |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com/v1/forecast` |
| `GEMINI_API_KEY` | A valid, newly issued key, if enabling the chat service |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `GEMINI_API_TIMEOUT_SECONDS` | `25.0` |
| `GEMINI_MAX_OUTPUT_TOKENS` | `2400` |

Only add the Gemini key in Render. Do not add it to Vercel, a `VITE_` variable,
the repository, or frontend code. If Gemini reports that the configured model
is unavailable, verify the model name and access for your Google AI project.
The chat service cannot use Gemini without a valid backend key.

### Configure persistent SQLite storage

The configured database path is persistent only when a Render disk is attached:

1. In the Render service's **Disks** settings, add a persistent disk on a plan
   that supports it.
2. Set its mount path to `/var/data`.
3. Keep `DATABASE_URL` set to `sqlite:////var/data/irrigation.db`.
4. Save the settings and redeploy if Render requests it.

Without a persistent disk, Render's filesystem is ephemeral and database data
can be lost when an instance is replaced or redeployed. The backend creates the
database parent directory when possible, enables SQLite WAL and a busy timeout,
and `/health` checks database availability. Persistent storage is not a
substitute for a backup plan.

### Configure CORS

Set `CORS_ORIGINS` to a comma-separated list of exact browser origins, with no
trailing slash or path. For example:

```text
https://your-app.vercel.app,https://www.example.org
```

Add a Vercel preview origin only if that specific preview needs API access.
Avoid wildcard origins. When the Vercel production domain changes, update this
setting and redeploy the Render service.

### Verify the Render service

Replace the placeholder with the service's actual Render hostname:

```powershell
Invoke-RestMethod https://your-service.onrender.com/health
Invoke-WebRequest https://your-service.onrender.com/docs
```

The health endpoint should report a healthy service and a ready database. If
the database check fails, verify the disk mount and `DATABASE_URL` before
troubleshooting application routes.

## 2. Deploy the frontend to Vercel

1. Import the same GitHub repository into Vercel.
2. Set **Root Directory** to `frontend` and **Framework Preset** to **Vite**.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

   The frontend package lockfile is checked in. `frontend/vercel.json` rewrites
   browser routes to the SPA entry point so direct navigation and refreshes can
   load the frontend; routes must also exist in the React application.

### Set frontend environment variables

In Vercel's **Settings → Environment Variables**, set the following for
Production. Add them to Preview only if you intend to use those preview
deployments.

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | Render origin only, e.g. `https://your-service.onrender.com` |
| `VITE_USE_MOCK_DATA` | `false` |
| `VITE_DEFAULT_LANGUAGE` | `en` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key |

Do not append `/api` to `VITE_API_BASE_URL`; the frontend builds API paths from
the base URL. All `VITE_` values are public in the browser bundle. Supabase's
publishable key is intended for client-side use, but never use a Supabase
service-role/secret key in the frontend.

Vercel applies environment variables at build time. Redeploy after adding or
changing them. In production, a missing API base URL should be fixed in Vercel;
the frontend does not use localhost as a production fallback.

After obtaining the Vercel production domain, add that exact origin to Render's
`CORS_ORIGINS` and redeploy the backend.

## 3. Configure Supabase authentication

The frontend uses Supabase for sign-in, registration, email recovery, password
reset, and sign-out. Set the project URL and publishable key in Vercel as
described above. The authentication pages display a configuration error if
those settings are absent or invalid.

In Supabase Authentication URL settings:

1. Add the deployed Vercel site origin to the allowed site URLs/redirect URLs.
2. Allow the `/login` redirect used after registration email confirmation.
3. Allow the `/reset-password` redirect used for password recovery.
4. Add exact preview URLs only when authentication on preview deployments is
   needed.

Use the callback URLs configured by the frontend when setting up the Supabase
project. Redeploy Vercel after changing its environment variables.

**Important security boundary:** Supabase authentication is currently a
frontend UI integration. FastAPI does not validate Supabase access tokens and
does not scope farm records to a user. Signing in does not protect API routes or
farm data. Do not use this deployment for private or multi-user-sensitive data
until backend authentication, authorization, and data ownership checks are
implemented.

## 4. Features and deployment limitations

### Irrigation and crop-planner models

- The irrigation recommendation endpoint uses the deterministic irrigation
  engine. Its optional ML adapter is disabled in the Render configuration
  (`ML_MODEL_ENABLED=false`). Do not enable it until the corresponding model
  artifacts, dependencies, supported runtime, and inference results have all
  been verified.
- Crop-planner model artifacts are present in the repository and may be used
  when compatible. Verify their provenance and predictions before relying on
  them for production decisions.
- `ml/crop_planner/SYNTHETIC_prices_NOT_REAL.csv` contains synthetic data. Do
  not present it as real market evidence.
- The optional `ml/crop_planner/requirements.txt` pins XGBoost 3.4.1, which
  requires Python 3.12 or newer. The Render configuration uses Python 3.11.11
  and installs `backend/requirements.txt`, not the optional crop-planner
  requirements. Do not enable XGBoost-dependent inference without resolving
  and testing this compatibility.

### Community Water

The `/app/community-water` page is an illustrative showcase. Its sample names,
availability, volumes, locations, and activity are not live community data;
the page's request preview is local to the browser and is not submitted or
persisted. The separate backend `/api/community-water` endpoints do persist
shared data and currently do not have authentication or authorization. Do not
expose those endpoints as private-user data.

### Other production considerations

- SQLite on a single persistent disk is suitable for a small demonstration, not
  a general multi-instance or high-concurrency database architecture. Plan and
  test backups and recovery before relying on stored data.
- Open-Meteo is configured as the weather provider; it does not require an API
  key in this application configuration.
- The backend sends chat requests to Google's Gemini API when configured.
  Avoid sending sensitive personal or farm information unless the applicable
  data-handling and provider requirements have been reviewed.
- A successful hosting build confirms packaging, not agronomic validity, data
  provenance, or live third-party service availability.

## 5. Post-deployment smoke test

1. Open the Vercel production URL and refresh the root page.
2. Open `/login` and confirm the authentication page loads. Sign-in requires
   valid Supabase configuration and an appropriately configured Supabase
   redirect allowlist.
3. Open a nested route directly, such as `/app/community-water`, and refresh.
   The SPA shell should load; the page's sample community data is illustrative.
4. In browser Developer Tools → **Network**, confirm live API requests target
   the configured Render origin and use the expected `/api/...` paths.
5. Check browser console and network responses for CORS, missing environment
   configuration, or API errors.
6. Confirm Render `/health` reports a ready database and Render `/docs` loads.
7. Test only with non-sensitive sample data until server-side authorization and
   user-level data separation are implemented.

The Vercel rewrite only returns the SPA shell; it cannot create application
routes that are not declared in the frontend.

## 6. Local checks before a deployment

Run these commands from the repository root in PowerShell. Use Python 3.11.11
for parity with the Render service, and install dependencies only in your
development environment:

```powershell
python -m pip install -r backend/requirements.txt
Push-Location backend
python -m pytest tests -q
python -c "from app.main import app; print(app.title)"
Pop-Location
Push-Location frontend
npm ci
npm run build
Pop-Location
```

Check the deployment files and environment-file ignore behavior:

```powershell
python -c "import yaml; yaml.safe_load(open('render.yaml', encoding='utf-8')); print('render.yaml: valid')"
python -c "import json; json.load(open('frontend/vercel.json', encoding='utf-8')); print('frontend/vercel.json: valid')"
Get-Content .python-version
git check-ignore -v .env backend/.env frontend/.env
git check-ignore -v .env.example backend/.env.example frontend/.env.example
git ls-files | Select-String '(^|/)\.env($|\.)'
```

The YAML check requires PyYAML; if it is unavailable, validate the Blueprint
with Render rather than adding a project dependency solely for this check.
These commands do not deploy the application or verify cloud credentials.

## 7. Troubleshooting

| Symptom | Checks |
| --- | --- |
| Render cannot import `app` or `ml` | Keep Render's root directory at `.` and use the configured start command. |
| Render port or health check fails | Listen on `0.0.0.0`, use `$PORT`, and set the health path to `/health`. |
| Database is not ready | Confirm the persistent disk is mounted at `/var/data` and the URL is `sqlite:////var/data/irrigation.db`. |
| Database data disappears after deploy | Confirm the service has a supported persistent disk; the default filesystem is ephemeral. |
| Browser reports a CORS error | Set Render `CORS_ORIGINS` to the exact Vercel origin and redeploy Render. |
| API calls use the wrong host | Set `VITE_API_BASE_URL` to the Render origin without `/api`, then rebuild/redeploy Vercel. |
| Authentication reports missing configuration | Set the Supabase URL and publishable key in Vercel and redeploy. Never substitute a service-role key. |
| Supabase email link fails | Check the Supabase site's allowed redirect URLs, including `/login` and `/reset-password`. |
| Gemini chat is unavailable | Check that a valid key is set only in Render and that `GEMINI_MODEL` is available to the Google AI project. |
| App still shows demo data | Switch to live mode in the app or clear the `agr002_use_mock` local-storage override. |
| Direct route refresh returns an error | Confirm `frontend/vercel.json` is deployed and the route is declared in the React app. |
| Irrigation ML does not run | It is intentionally disabled by `ML_MODEL_ENABLED=false`; the deterministic irrigation engine remains the fallback. |
| Crop-planner output is unexpected | Verify model provenance, runtime/dependency compatibility, and data origin; synthetic prices are not market evidence. |

## 8. Deployment checklist

- [ ] Latest intended commit is pushed to the branch connected to hosting.
- [ ] Render root, build/start commands, Python version, and `/health` path match
      this guide.
- [ ] A persistent Render disk is mounted at `/var/data`.
- [ ] Render secrets are entered through its Dashboard; the previously exposed
      Gemini key has been rotated.
- [ ] `CORS_ORIGINS` contains the exact deployed Vercel origin.
- [ ] Vercel root is `frontend`; production build settings and environment
      variables are configured.
- [ ] Supabase redirect URLs match the deployed site.
- [ ] Render health/docs and Vercel direct-route refresh have been checked.
- [ ] No private data is used as if protected by the frontend-only auth UI.
