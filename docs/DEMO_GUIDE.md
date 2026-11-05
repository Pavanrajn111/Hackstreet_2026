# AGR002 Smart Irrigation — Demo Presentation Guide

This guide walks you through presenting the application to hackathon judges using our sample **Bengaluru Green Fields** farm scenario.

---

## 1. Demo Scenario Overview

- **Farm Name:** Bengaluru Green Fields
- **Location:** Bengaluru Rural, Karnataka ($12.9716^\circ\text{ N}, 77.5946^\circ\text{ E}$)
- **Crop:** Tomato (Vegetative / Flowering stage, 21 Days After Sowing)
- **Soil Type:** Red Sandy Loam (common Karnataka soil with moderate water holding capacity)
- **Area:** 1.5 Hectares ($15,000\text{ m}^2$)
- **Irrigation System:** Drip Irrigation (90% water application efficiency)
- **Pump Capacity:** 120 Litres/min

---

## 2. 3-Minute Hackathon Demo Script

### Step 1: Problem Statement (30 seconds)
> *"Judges, smallholder farmers often irrigate either too much or too little because they lack real-time soil water depletion tracking. Over-irrigation wastes electricity and groundwater; under-irrigation stunts yields. AGR002 provides a phone-first smart irrigation advisor that tells the farmer exactly: **Should I irrigate today, how many millimeters, and for how many minutes should I run my pump?**"*

### Step 2: Live Dashboard Walkthrough (60 seconds)
1. **Show the Decision Banner:**
   - Point out the bold, high-contrast banner: **"Irrigate Today"** with the **"Moderate Risk"** badge.
   - Highlight the concrete recommendation: **18.5 mm** net water depth.
   - Show the calculated pump runtime: **231 minutes** (approx 3.8 hours) at 120 L/min flow rate.
2. **Explain the Science Engine:**
   - Scroll to the **Field Advice** explanation card: explain how the system uses crop stage (Kc factor $0.85$) and evapotranspiration ($ET_0$) to calculate soil moisture balance.
3. **Show Multilingual Accessibility:**
   - Use the language selector in the top-right header to switch to **ಕನ್ನಡ (Kannada)** or **हिन्दी (Hindi)**.
   - Demonstrate how farmers can read advice in their native language with accessible typography and touch targets.

### Step 3: Interactive Farm Setup & Adjustment (45 seconds)
1. Navigate to **Farm Setup**.
2. Change the crop to **Maize** or adjust the irrigation method to **Flood / Furrow**.
3. Click **"Save Farm & Refresh Advice"**.
4. Show how the recommendation dynamically recalibrates depth and pump time based on crop water requirements.

### Step 4: 7-Day Planning & Weather Awareness (30 seconds)
1. Navigate to the **7-Day Plan** tab.
2. Show the Recharts bar graph visualizing daily water volume.
3. Point out the **"Rain Pause"** indicator on day 4: the engine predicts rainfall and advises the farmer to skip irrigation, directly conserving water and diesel/electricity costs.

### Step 5: Toggle Mock Data to Live Backend (15 seconds)
1. In the top-right header, click the **"Mock Data" / "Live Backend"** pill.
2. Demonstrate seamless fallback: the app works seamlessly offline or with mock data, and connects directly to FastAPI + SQLite when the server is active.

---

## 3. Anticipated Judge Questions & Strong Answers

**Q1: Is this machine learning model real?**
> *"In this MVP foundation, we implemented a baseline FAO-56 Penman-Monteith water-balance engine. We have structured a modular `ml/` interface with a documented contract where our ML teammate can drop in trained Random Forest or XGBoost models to predict dynamic soil moisture depletion without breaking system uptime."*

**Q2: What happens if there's no internet connectivity on the farm?**
> *"The frontend is engineered with offline mock capabilities and local storage caching. Once loaded on the farmer's mobile browser, the app can retain previous schedules and farm profiles."*
