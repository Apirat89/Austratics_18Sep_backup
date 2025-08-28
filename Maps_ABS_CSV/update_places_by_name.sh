#!/usr/bin/env bash
set -euo pipefail

DIR="/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/Maps_ABS_CSV"
F1="$DIR/Residential_May2025_ExcludeMPS_updated2.json"   # Filename1 (target)
F2="$DIR/healthcare_simplified.geojson"                   # Filename2 (source)
OUT="$DIR/Residential_May2025_ExcludeMPS_updated2_with_places_by_name.json"
BKP="$F1.bak.$(date +%Y%m%d%H%M%S)"

# Optional: backup the target file (not modified in-place, but good to keep)
cp "$F1" "$BKP"

python3 - <<'PY'
import json, os, re

DIR = "/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/Maps_ABS_CSV"
F1 = os.path.join(DIR, "Residential_May2025_ExcludeMPS_updated2.json")
F2 = os.path.join(DIR, "healthcare_simplified.geojson")
OUT = os.path.join(DIR, "Residential_May2025_ExcludeMPS_updated2_with_places_by_name.json")

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(p, obj):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def normalize(s):
    if s is None:
        return ""
    s = str(s).upper().strip()
    s = re.sub(r"\s+", " ", s)
    return s

def iter_records(obj):
    # Supports list, FeatureCollection, or single dict
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

def find_field_ci(d, field):
    # search top-level
    for k in list(d.keys()):
        if k.lower() == field.lower():
            return d, k
    # then inside "properties"
    props = d.get("properties")
    if isinstance(props, dict):
        for k in list(props.keys()):
            if k.lower() == field.lower():
                return props, k
    return None, None

def get_field(d, field):
    cont, k = find_field_ci(d, field)
    return cont.get(k) if cont and k else None

def set_field(d, field, value):
    cont, k = find_field_ci(d, field)
    if cont is None:
        # prefer placing in properties if it exists
        if isinstance(d.get("properties"), dict):
            d["properties"][field] = value
        else:
            d[field] = value
    else:
        cont[k] = value

# --- Load files
src = load_json(F2)  # Filename2 (GeoJSON)
dst = load_json(F1)  # Filename1 (Residential JSON)

# --- Build map from Filename2: Service_Name -> Residential_Places (ONLY when Care_Type == "Residential")
name_to_places = {}
conflicts = 0
for rec in iter_records(src):
    care = get_field(rec, "Care_Type")
    if str(care).strip().lower() != "residential":
        continue
    svc = get_field(rec, "Service_Name")
    if not svc:
        continue
    key = normalize(svc)
    places = get_field(rec, "Residential_Places")
    if key in name_to_places and name_to_places[key] != places and places is not None:
        conflicts += 1
    if key not in name_to_places or (name_to_places[key] is None and places is not None):
        name_to_places[key] = places

# --- Update Filename1 when any of provider_name / previous_name / Service Name matches Filename2 Service_Name
scanned = 0
updated = 0
matched_records = 0

for rec in iter_records(dst):
    scanned += 1
    candidates = [
        get_field(rec, "provider_name"),
        get_field(rec, "previous_name"),
        get_field(rec, "Service Name"),
    ]
    matched_val = None
    for c in candidates:
        key = normalize(c)
        if key and key in name_to_places:
            matched_val = name_to_places[key]
            break
    if matched_val is not None:
        set_field(rec, "Residential_Places", matched_val)
        updated += 1
        matched_records += 1

# --- Save updated copy
save_json(OUT, dst)

print(f"Filename2 (source) entries mapped: {len(name_to_places)} (conflicts detected: {conflicts})")
print(f"Filename1 (target) records scanned: {scanned}")
print(f"Records updated (Residential_Places set): {updated}")
print(f"Wrote updated file: {OUT}")
PY

echo "Done. Backup saved at: $BKP"
