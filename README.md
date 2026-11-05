# AGR002 — Smart Irrigation & Water Management

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Styles-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A farmer-friendly, phone-first application designed to optimize crop water efficiency. **AGR002** advises farmers exactly **when, how much, and for how long** to irrigate based on real-time soil water depletion, crop growth stages (FAO-56 single crop coefficients), local weather forecasts, and soil characteristics.

---

## 🌾 Key Features

1. **Clear, Actionable Decision Banners:**
   - Instant decision: **"Irrigate Today"** vs. **"No Irrigation Needed Today"**.
   - Net water depth recommendation in **millimeters ($mm$)**.
   - Total water requirement calculated in **litres ($L$)** based on acreage.
   - Estimated **pump runtime in minutes** based on pump flow capacity ($L/min$).

2. **Agronomic Water-Balance Engine:**
   - Implements **FAO-56 Penman-Monteith** baseline calculations.
   - Calculates daily reference evapotranspiration ($ET_0$) and crop evapotranspiration ($ET_c = K_c \times ET_0$).
   - Dynamic stage detection (Initial, Vegetative, Mid-Season, Late) based on days after sowing (DAS).

3. **Weather-Aware 7-Day Planning:**
   - 7-day forecast with precipitation alerts.
   - Automatic **"Rain Pause"** recommendations when rain is forecast, preventing waterlogging and saving power/fuel.
   - Interactive water requirement charts powered by Recharts.

4. **Farmer-First Accessibility & Multilingual Support:**
   - Fully phone-responsive with large touch targets and high-contrast color badges.
   - Instant language switching: **English**, **ಕನ್ನಡ (Kannada)**, and **हिन्दी (Hindi)**.
   - Plain language explanations without confusing technical jargon.

5. **Offline & Mock Mode Support:**
   - Built-in one-click toggle between **Mock Data** and **Live FastAPI Backend** for rapid frontend development and offline field demos.

6. **Modular ML Architecture:**
   - Isolated `ml/` subsystem interface ready for predictive soil moisture models without breaking system uptime.

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS | Phone-first, lightweight SPA |
| **Data Viz** | Recharts, Lucide Icons | Responsive charts & accessible icons |
| **Routing** | React Router v6 | Client-side routing with clean URLs |
| **Backend** | Python 3.11, FastAPI, Pydantic v2 | High-performance async REST API |
| **Database** | SQLite, SQLAlchemy ORM | Lightweight, zero-config local relational DB |
| **ML Module** | Scikit-learn, NumPy, Pandas | Isolated predictive adjustment module |
| **Testing** | Pytest, HTTPX | Automated API and health checks |

---

## 👥 Team Roles & Responsibilities

| Role | Member | Primary Focus | Working Directory |
| :--- | :--- | :--- | :--- |
| **Project Lead / Admin** | Repository Owner | Architecture, shared contract, git releases | Root, `shared/`, `docs/` |
| **Frontend Developer** | Teammate A | UI/UX, mobile layout, charts, translations | `frontend/` |
| **Backend Developer** | Teammate B | FastAPI routes, FAO-56 engine, database | `backend/` |
| **ML Engineer** | Teammate C | Model training, feature pipelines, inference | `ml/` |

---

## 📁 Repository Structure

```text
AGR002-Smart-Irrigation/
├── frontend/                     # React + Vite + Tailwind CSS application
│   ├── src/
│   │   ├── components/           # StatusCard, WeatherPanel, IrrigationSchedule, etc.
│   │   ├── pages/                # DashboardPage, FarmSetupPage, SchedulePage, HistoryPage
│   │   ├── data/                 # mockFarm.js, mockRecommendation.js
│   │   ├── i18n/                 # en.json, kn.json, hi.json translations
│   │   └── services/api.js       # Unified Axios API client with mock toggle
│   └── package.json
├── backend/                      # FastAPI Python REST backend
│   ├── app/
│   │   ├── api/routes/           # crops.py, soils.py, recommend.py, farms.py, history.py
│   │   ├── core/                 # database.py, config.py
│   │   ├── models/               # SQLAlchemy models (FarmModel, IrrigationLogModel)
│   │   ├── schemas/              # Pydantic v2 validation schemas
│   │   ├── services/             # irrigation_engine.py (FAO-56 water-balance)
│   │   └── main.py               # Application factory & CORS configuration
│   ├── tests/                    # Pytest health and API validation tests
│   └── requirements.txt
├── ml/                           # Machine Learning model integration module
│   ├── README.md                 # Detailed ML contributor guide (features, units)
│   ├── model_interface.py        # Safe placeholder inference manager
│   └── requirements.txt
├── shared/
│   └── api-contract/             # Single source of truth for API schemas
│       ├── README.md             # Formal documentation of fields and units
│       ├── recommend-request.json
│       └── recommend-response.json
├── docs/
│   ├── SETUP.md                  # PowerShell setup commands for teammates
│   ├── TEAM_WORKFLOW.md          # Git branching, PR workflow, and task division
│   └── DEMO_GUIDE.md             # 3-minute hackathon pitch with Bengaluru farm demo
├── .env.example                  # Root environment template
├── .gitignore                    # Comprehensive ignore rules
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone the Repository
```powershell
git clone <YOUR-GITHUB-REPO-URL>
cd Hackstreet
```

### 2. Run Backend (Terminal 1)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 3. Run Frontend (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
- Application: [http://localhost:5173](http://localhost:5173)

For detailed installation instructions, see [docs/SETUP.md](docs/SETUP.md).

---

## ⚠️ Scientific & Disclaimer Notice
The calculations in this MVP represent an educational demonstration based on preliminary FAO-56 Penman-Monteith heuristic formulas. They are **not** certified agronomic prescriptions. Teammates must not claim peer-reviewed scientific validation or production certification during competition demonstrations.
