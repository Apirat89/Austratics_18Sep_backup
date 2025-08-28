#!/usr/bin/env bash
set -euo pipefail

DIR="/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/Maps_ABS_CSV"
GEO="$DIR/healthcare_simplified.geojson"
INP="$DIR/Residential_May2025_ExcludeMPS_updated_with_finance.json"
OUT="$DIR/Residential_May2025_ExcludeMPS_updated_with_places_fuzzy.json"
CSV="$DIR/residential_match_summary.csv"
BKP="$INP.bak.$(date +%Y%m%d%H%M%S)"
THRESHOLD=90  # fuzzy match threshold (percent)

# Optional backup of input Residential file
cp "$INP" "$BKP"

# Prefer RapidFuzz for matching; fall back to difflib if not present
python3 -m pip install --user --quiet rapidfuzz || true

python3 - <<'PY'
import json, os, csv, re, difflib

DIR = "/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/Maps_ABS_CSV"
GEO = os.path.join(DIR, "healthcare_simplified.geojson")
INP = os.path.join(DIR, "Residential_May2025_ExcludeMPS_updated_with_finance.json")
OUT = os.path.join(DIR, "Residential_May2025_ExcludeMPS_updated_with_places_fuzzy.json")
CSV = os.path.join(DIR, "residential_match_summary.csv")
THRESHOLD = 80

# Try RapidFuzz
try:
    from rapidfuzz import process as rf_process
    from rapidfuzz import fuzz as rf_fuzz
    HAVE_RAPIDFUZZ = True
except Exception:
    HAVE_RAPIDFUZZ = False

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(p, obj):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def normalize_address(s):
    if s is None:
        return ""
    s = str(s).upper().strip()
    s = re.sub(r"[,\.;#]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s

def find_field_case_insensitive(d, field):
    # Search top-level first
    for k in list(d.keys()):
        if k.lower() == field.lower():
            return d, k
    # Then properties
    props = d.get("properties")
    if isinstance(props, dict):
        for k in list(props.keys()):
            if k.lower() == field.lower():
                return props, k
    return None, None

def get_field(d, field):
    cont, k = find_field_case_insensitive(d, field)
    return cont.get(k) if cont and k else None

def set_field(d, field, value):
    cont, k = find_field_case_insensitive(d, field)
    if cont is None:
        if isinstance(d.get("properties"), dict):
            d["properties"][field] = value
        else:
            d[field] = value
    else:
        cont[k] = value

def iter_records(obj):
    if isinstance(obj, list):
        for r in obj:
            if isinstance(r, dict):
                yield r
    elif isinstance(obj, dict):
        feats = obj.get("features")
        if isinstance(feats, list):
            for ft in feats:
                if isinstance(ft, dict):
                    yield ft
        else:
            yield obj

# Load data
geo = load_json(GEO)
res = load_json(INP)

# GEO: keep only Residential (and only these go into CSV)
geo_items = []
for rec in iter_records(geo):
    if str(get_field(rec, "Care_Type")).strip() != "Residential":
        continue
    service_name = get_field(rec, "Service_Name")
    phys_addr = get_field(rec, "Physical_Address")
    places = get_field(rec, "Residential_Places")
    geo_items.append({
        "service_name": service_name,
        "phys_addr": phys_addr,
        "places": places if places is not None else "NA",
        "norm": normalize_address(phys_addr),
    })

# Residential file records
res_items = []
for rec in iter_records(res):
    fmt = get_field(rec, "formatted_address")
    prov = get_field(rec, "provider_name")
    if prov is None:
        prov = get_field(rec, "Provider_Name")
    res_items.append({
        "rec": rec,
        "formatted_address": fmt,
        "provider_name": prov,
        "norm": normalize_address(fmt),
    })

geo_norms = [g["norm"] for g in geo_items]
res_norms = [r["norm"] for r in res_items]

def best_geo_for_res(norm_target):
    if not norm_target or not geo_norms:
        return None, 0, None
    if HAVE_RAPIDFUZZ:
        m = rf_process.extractOne(norm_target, geo_norms, scorer=rf_fuzz.token_set_ratio, score_cutoff=THRESHOLD)
        if m:
            return geo_items[m[2]], m[1], m[2]
        return None, 0, None
    # difflib fallback
    scores = [(i, int(difflib.SequenceMatcher(None, norm_target, n).ratio()*100)) for i, n in enumerate(geo_norms)]
    if not scores:
        return None, 0, None
    i, score = max(scores, key=lambda x: x[1])
    return (geo_items[i], score, i) if score >= THRESHOLD else (None, score, i)

def best_res_for_geo(norm_target):
    if not norm_target or not res_norms:
        return None, 0, None
    if HAVE_RAPIDFUZZ:
        m = rf_process.extractOne(norm_target, res_norms, scorer=rf_fuzz.token_set_ratio, score_cutoff=THRESHOLD)
        if m:
            return res_items[m[2]], m[1], m[2]
        return None, 0, None
    # difflib fallback
    scores = [(i, int(difflib.SequenceMatcher(None, norm_target, n).ratio()*100)) for i, n in enumerate(res_norms)]
    if not scores:
        return None, 0, None
    i, score = max(scores, key=lambda x: x[1])
    return (res_items[i], score, i) if score >= THRESHOLD else (None, score, i)

# Update Residential JSON with Residential_Places via fuzzy match
updated_matched = 0
updated_missed = 0
for r in res_items:
    g, score, _ = best_geo_for_res(r["norm"])
    if g:
        set_field(r["rec"], "Residential_Places", g["places"])
        updated_matched += 1
    else:
        set_field(r["rec"], "Residential_Places", "NA")
        updated_missed += 1

# Build CSV with new order:
# provider_name | Service_Name | Physical_Address | formatted_address | residential_places
rows = []
summary_matched = 0
summary_missed = 0
for g in geo_items:
    r, score, _ = best_res_for_geo(g["norm"])
    if r:
        rows.append([
            r["provider_name"] if r["provider_name"] is not None else "",
            g["service_name"] if g["service_name"] is not None else "",
            g["phys_addr"] if g["phys_addr"] is not None else "",
            r["formatted_address"] if r["formatted_address"] is not None else "",
            g["places"]
        ])
        summary_matched += 1
    else:
        rows.append([
            "NA",  # provider_name
            g["service_name"] if g["service_name"] is not None else "",
            g["phys_addr"] if g["phys_addr"] is not None else "",
            "NA",  # formatted_address
            g["places"]
        ])
        summary_missed += 1

# Write outputs
save_json(OUT, res)
with open(CSV, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow(["provider_name", "Service_Name", "Physical_Address", "formatted_address", "residential_places"])
    w.writerows(rows)

print(f"Fuzzy threshold: {THRESHOLD}%")
print(f"Residential file updated: matched {updated_matched}, no-match {updated_missed}")
print(f"Summary CSV: {len(rows)} rows (matched {summary_matched}, no-match {summary_missed})")
print(f"Wrote updated Residential JSON -> {OUT}")
print(f"Wrote summary CSV -> {CSV}")
PY

echo "Done. Backup saved at: $BKP"
