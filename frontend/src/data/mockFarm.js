// Default Demo Farm Preset: Tomato farm — Bengaluru
export const defaultFarm = {
  farm_name: "Bengaluru Green Fields",
  district: "Bengaluru Rural",
  latitude: 12.9716,
  longitude: 77.5946,
  crop: "Tomato",
  soil_type: "Red Sandy Loam",
  sowing_date: "2026-10-15",
  farm_area_hectares: 1.5,
  irrigation_method: "Drip Irrigation",
  last_irrigation_date: "2026-11-02",
  pump_flow_rate_lpm: 120.0,
};

// Supported Karnataka & regional districts
export const karnatakaDistricts = [
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Kolar",
  "Chikkaballapura",
  "Mandya",
  "Mysuru",
  "Tumakuru",
  "Hassan",
  "Belagavi",
  "Dharwad",
  "Shivamogga",
  "Kalaburagi",
  "Vijayapura",
  "Other / Custom",
];

export const sampleCrops = [
  {
    id: "tomato",
    name: "Tomato",
    category: "Vegetable",
    icon: "🍅",
    duration_days: 110,
    water_need: "Medium-High",
    description: "Sensitive to water stress during flowering & fruit setting.",
  },
  {
    id: "rice",
    name: "Rice",
    category: "Grain",
    icon: "🌾",
    duration_days: 130,
    water_need: "High",
    description: "Requires consistent shallow standing water or alternate wetting & drying.",
  },
  {
    id: "maize",
    name: "Maize",
    category: "Grain",
    icon: "🌽",
    duration_days: 100,
    water_need: "Medium",
    description: "Critical moisture sensitivity at tasseling & silking stages.",
  },
  {
    id: "wheat",
    name: "Wheat",
    category: "Grain",
    icon: "🌾",
    duration_days: 120,
    water_need: "Medium",
    description: "Crown root initiation & flowering are critical irrigation periods.",
  },
  {
    id: "cotton",
    name: "Cotton",
    category: "Fiber / Cash",
    icon: "🌱",
    duration_days: 150,
    water_need: "Medium",
    description: "Deep rooting, requires measured moisture during squaring & boll formation.",
  },
];

export const sampleSoils = [
  {
    id: "red-sandy-loam",
    name: "Red Sandy Loam",
    color: "#b45309",
    description: "Southern Karnataka regional soil. Fast drainage, moderate water holding capacity (130 mm/m).",
    advice: "Best suited for drip irrigation with frequent, controlled pulses.",
  },
  {
    id: "clay-black",
    name: "Clay / Black Soil",
    color: "#334155",
    description: "Deep Deccan Vertisols. High water retention (180 mm/m), slow infiltration.",
    advice: "Avoid over-irrigation to prevent waterlogging and root rot.",
  },
  {
    id: "alluvial-loam",
    name: "Alluvial Loam",
    color: "#78716c",
    description: "Fertile river plains. Balanced porosity and excellent water storage (160 mm/m).",
    advice: "Versatile soil, optimal for drip or micro-sprinklers.",
  },
  {
    id: "sandy-soil",
    name: "Sandy Soil",
    color: "#d97706",
    description: "Coarse texture, low moisture retention (90 mm/m), rapid percolation.",
    advice: "Requires short, frequent watering cycles to minimize deep percolation loss.",
  },
];

export const irrigationMethods = [
  {
    id: "Drip Irrigation",
    name: "Drip Irrigation",
    efficiency: "90%",
    description: "Water applied directly to root zone. High water savings.",
    recommended: true,
  },
  {
    id: "Sprinkler",
    name: "Sprinkler",
    efficiency: "75%",
    description: "Simulates rainfall, good for undulating terrain.",
    recommended: false,
  },
  {
    id: "Flood / Furrow",
    name: "Flood / Furrow",
    efficiency: "60%",
    description: "Traditional gravity flow. High surface evaporation.",
    recommended: false,
  },
];
