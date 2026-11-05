# AGR002 Smart Irrigation — Developer Setup Guide

This guide contains exact, step-by-step Windows PowerShell commands to set up and run both the Frontend and Backend services on your local development machine.

---

## 1. Prerequisites

Verify that Node.js and Python are available on your system:

```powershell
node --version       # Expected: v18.0.0 or higher (e.g. v20 or v24)
npm --version        # Expected: v9.0.0 or higher
python --version     # Expected: Python 3.10 or 3.11
```

> [!TIP]
> If `python` is not recognized, install `uv` (a lightweight package and Python manager):
> ```powershell
> irm https://astral.sh/uv/install.ps1 | iex
> $env:Path = "C:\Users\$env:USERNAME\.local\bin;$env:Path"
> uv python install 3.11
> ```

---

## 2. Backend Setup (FastAPI + SQLite)

Open a PowerShell terminal and navigate to the `backend/` directory:

```powershell
# 1. Navigate to backend directory
cd c:\Users\LEnobo\Desktop\Hackstreet\backend

# 2. Create Python virtual environment
python -m venv .venv
# (Or using uv: uv venv .venv --python 3.11)

# 3. Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
# (Or using uv: uv pip install -r requirements.txt)

# 5. Create local environment configuration
Copy-Item .env.example .env

# 6. Run automated test suite to verify setup
pytest tests/

# 7. Start the FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend server will be live at:
- **API Base:** `http://127.0.0.1:8000`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Check:** `http://127.0.0.1:8000/health`

---

## 3. Frontend Setup (React + Vite + Tailwind CSS)

Open a **second** PowerShell terminal and navigate to `frontend/`:

```powershell
# 1. Navigate to frontend directory
cd c:\Users\LEnobo\Desktop\Hackstreet\frontend

# 2. Install npm dependencies
npm install

# 3. Create local environment configuration
Copy-Item .env.example .env

# 4. Start the Vite development server
npm run dev
```

The frontend application will be live at:
- **URL:** `http://localhost:5173`

---

## 4. Switching Between Mock Mode and Live Backend

The frontend is configured to run out-of-the-box in **Mock Mode** so UI development can proceed independently:
- **Toggle in the UI:** In the top-right header, click the button that says `Mock Data` / `Live Backend` to switch between modes instantly without restarting servers.
- **Toggle via `.env`:** Edit `frontend/.env`:
  ```ini
  VITE_USE_MOCK_DATA=false   # Sets Live Backend as default
  VITE_USE_MOCK_DATA=true    # Sets Mock Data as default
  ```

---

## 5. Machine Learning Environment (Optional for ML Teammate)

If you are working on the ML subsystem in `ml/`:

```powershell
cd c:\Users\LEnobo\Desktop\Hackstreet\ml
python -m venv ml_env
.\ml_env\Scripts\Activate.ps1
pip install -r requirements.txt
```
See [ml/README.md](../ml/README.md) for full instructions on features, units, and model integration.
