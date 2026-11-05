# Auto-exported helper functions. Needs: suit_model, KB, PRICE, CROP2COMMODITY defined (see notebook).
import numpy as np, pandas as pd

def range_score(v, lo, hi, tol=0.25):
    # 1.0 inside [lo,hi]; decays linearly to 0 at tol*(hi-lo) outside
    if lo <= v <= hi: return 1.0
    w = max((hi - lo) * tol, 1e-9)
    d = (lo - v) if v < lo else (v - hi)
    return float(max(0.0, 1 - d / w))


def fit_score(farm, row):
    parts, notes = {}, []
    parts["pH"]       = range_score(farm["ph"], row.ph_min, row.ph_max)
    parts["rainfall"] = range_score(farm["rainfall_mm_yr"], row.rain_min, row.rain_max)
    parts["temp"]     = range_score(farm["temp_c"], row.temp_min, row.temp_max)
    parts["soil"]     = 1.0 if farm["soil"] in row.soil_list else 0.4
    # shade: if the main crop shades the plant a lot but the plant is shade-intolerant
    shade = farm.get("shade_level", 0.3)          # 0 = open field, 1 = heavy shade
    parts["shade"]    = 1.0 if shade <= row.shade_tol + 0.2 else max(0.0, 1 - (shade - row.shade_tol - 0.2) * 2)
    vals = np.array(list(parts.values()))
    score = 0.6 * vals.mean() + 0.4 * vals.min()   # one bad factor pulls the score down
    for k, v in parts.items():
        if v < 0.6: notes.append(f"{k} is a weak match")
    # irrigation: rainfall deficit warning
    if farm["rainfall_mm_yr"] < row.rain_min: notes.append("needs extra irrigation")
    return round(float(score), 3), notes


def ml_score(farm, crop):
    # Kaggle-model probability, only for crops that exist in that dataset (e.g. coconut, papaya)
    if crop not in suit_model.classes_: return None
    x = pd.DataFrame([{ "n": farm["n"], "p": farm["p"], "k": farm["k"], "temperature": farm["temp_c"],
                        "humidity": farm["humidity"], "ph": farm["ph"], "rainfall": farm["rainfall_mm_yr"]/RAIN_DIVISOR }])
    return float(suit_model.predict_proba(x)[0][list(suit_model.classes_).index(crop)])


def make_feats(s):
    f = pd.DataFrame({"y": s})
    for l in (1, 2, 3, 12): f[f"lag{l}"] = f["y"].shift(l)
    f["roll3"] = f["y"].shift(1).rolling(3).mean()
    mo = f.index.month
    f["m_sin"], f["m_cos"] = np.sin(2*np.pi*mo/12), np.cos(2*np.pi*mo/12)
    return f.dropna()


def cashflow(row, years=15, price_growth=0.03, disc=0.10, price_mult=1.0):
    cf = []
    annual = row.life_years <= 1
    for t in range(1, years + 1):
        cost = row.annual_cost_per_plant + (row.est_cost_per_plant if (t == 1 or annual) else 0)
        if row.life_years < years and not annual and t > row.life_years: cost, rev = 0, 0
        else:
            if annual: ramp = 1.0 if row.years_to_first_yield <= 1 else 0.0
            elif t < np.ceil(row.years_to_first_yield): ramp = 0.0
            elif t == np.ceil(row.years_to_first_yield): ramp = 0.6      # first bearing year is partial
            else: ramp = 1.0
            rev = ramp * row.yield_per_plant_yr * row.price_per_unit * price_mult * (1 + price_growth) ** (t - 1)
        cf.append(rev - cost)
    cf = np.array(cf); disc_cf = cf / (1 + disc) ** np.arange(1, years + 1)
    cum = np.cumsum(cf); pay = int(np.argmax(cum > 0) + 1) if (cum > 0).any() else None
    return cf, float(disc_cf.sum()), pay


def plants_for(row, farm):
    if row.layout in ("boundary", "border"):   return int(farm["boundary_m"] / row.spacing_m)
    area_m2 = farm["area_acre"] * 4047 * farm.get("intercrop_share", 0.15)   # share of field used
    return int(area_m2 / (row.spacing_m ** 2))


def water_demand_l_day(row, n): return row.water_l_plant_day * n


def recommend(farm, years=15, top=8):
    out = []
    for r in KB.itertuples():
        fit, notes = fit_score(farm, r)
        ml = ml_score(farm, r.crop)
        com = CROP2COMMODITY.get(r.crop)
        mult = PRICE[com]["growth"] if com in PRICE else 1.0
        cf, npv, pay = cashflow(r, years=years, price_mult=mult)
        n = plants_for(r, farm)
        out.append(dict(crop=r.crop, layout=r.layout, fit=fit, ml_prob=None if ml is None else round(ml, 2),
                        plants=n, first_income_year=int(np.ceil(r.years_to_first_yield)),
                        payback_year=pay, npv_per_plant=round(npv), npv_total=round(npv * n * fit),   # fit-weighted
                        water_l_day=round(water_demand_l_day(r, n)), notes="; ".join(notes)))
    res = pd.DataFrame(out)
    res = res[res.fit >= 0.5].sort_values("npv_total", ascending=False)
    # compare like with like: best 2 per layout (boundary / border / intercrop / understorey), then overall order
    res = res.groupby("layout", group_keys=False).head(2).sort_values("npv_total", ascending=False)
    return res.head(top).reset_index(drop=True)
