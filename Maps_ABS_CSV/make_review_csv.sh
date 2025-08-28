#!/usr/bin/env bash
set -euo pipefail

DIR="/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/Maps_ABS_CSV"
F1="$DIR/Residential_May2025_ExcludeMPS_updated2.json"   # Filename1 (Residential)
F2="$DIR/healthcare_simplified.geojson"                   # Filename2 (GeoJSON)
CSV="$DIR/review_residential_union_filename1_filename2.csv"

python3 - <<'PY'
import json, os, csv, re

DIR = "/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/Maps_ABS_CSV"
F1 = os.path.join(DIR, "Residential_May2025_ExcludeMPS_updated2_with_places_by_name.json")   # filename1
F2 = os.path.join(DIR, "healthcare_simplified.geojson")                   # filename2
CSV = os.path.join(DIR, "review_residential_union_filename1_filename2.csv")

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def normalize(s):
    if s is None:
        return ""
    s = str(s).upper().strip()
    s = re.sub(r"\s+", " ", s)
    return s

def find_field_ci(d, field):
    # top-level
    for k in list(d.keys()):
        if k.lower() == field.lower():
            return d, k
    # nested "properties"
    props = d.get("properties")
    if isinstance(props, dict):
        for k in list(props.keys()):
            if k.lower() == field.lower():
                return props, k
    return None, None

def get_field(d, field):
    cont, k = find_field_ci(d, field)
    return cont.get(k) if cont and k else None

def iter_records(obj):
    # supports list, FeatureCollection, or single dict
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

# ---- Load both files
res = load_json(F1)   # filename1
geo = load_json(F2)   # filename2

# ---- Extract rows from filename2 (GeoJSON) but ONLY Care_Type == "Residential"
geo_rows = []
for rec in iter_records(geo):
    care = get_field(rec, "Care_Type")
    if str(care).strip().lower() != "residential":
        continue
    svc = get_field(rec, "Service_Name")
    phys = get_field(rec, "Physical_Address")
    places2 = get_field(rec, "Residential_Places")
    geo_rows.append({
        "service_name": svc if svc is not None else "",
        "physical_address": phys if phys is not None else "",
        "res_places2": places2 if places2 is not None else "NA",
        "norm": normalize(svc),
    })

# ---- Extract rows from filename1 (Residential JSON)
res_rows = []
for rec in iter_records(res):
    prov = get_field(rec, "provider_name")
    if prov is None:
        prov = get_field(rec, "Provider_Name")
    prev = get_field(rec, "previous_name")
    sname_space = get_field(rec, "Service Name")     # with space
    sname_us = get_field(rec, "Service_Name")        # underscore variant if present
    fmt = get_field(rec, "formatted_address")
    places1 = get_field(rec, "Residential_Places")
    res_rows.append({
        "provider_name": prov if prov is not None else "",
        "previous_name": prev if prev is not None else "",
        "service_name_space": sname_space if sname_space is not None else "",
        "service_name_us": sname_us if sname_us is not None else "",
        "formatted_address": fmt if fmt is not None else "",
        "res_places1": places1 if places1 is not None else "NA",
        "norm_candidates": list({
            normalize(prov),
            normalize(prev),
            normalize(sname_space),
            normalize(sname_us),
        }),
    })

# ---- Build index from filename1 names -> list of row indices (handle duplicates)
index1 = {}
for i, r in enumerate(res_rows):
    for key in r["norm_candidates"]:
        if key:
            index1.setdefault(key, []).append(i)

# ---- Build CSV (union with pairing)
rows_out = []
matched_res_indices = set()

# Pair each filename2 (Residential-only) row to at most one filename1 row by name
for g in geo_rows:
    key = g["norm"]
    i_candidates = index1.get(key, [])
    i_match = None
    for i in i_candidates:
        if i not in matched_res_indices:
            i_match = i
            break
    if i_match is None and i_candidates:
        i_match = i_candidates[0]  # allow reuse if all already matched

    if i_match is not None:
        r = res_rows[i_match]
        matched_res_indices.add(i_match)
        rows_out.append([
            g["service_name"],                 # col1: Service_Name (filename2)
            r["provider_name"] or "NA",        # col2: provider_name (filename1)
            g["physical_address"],             # col3: Physical_Address (filename2)
            r["formatted_address"] or "NA",    # col4: formatted_address (filename1)
            g["res_places2"],                  # col5: residential_places (filename2)
            r["res_places1"]                   # col6: residential_places (filename1)
        ])
    else:
        # filename2 (Residential) exists, no filename1 match
        rows_out.append([
            g["service_name"],
            "NA",
            g["physical_address"],
            "NA",
            g["res_places2"],
            "NA"
        ])

# Add remaining filename1 rows that did NOT match any filename2 (Residential) row
for i, r in enumerate(res_rows):
    if i in matched_res_indices:
        continue
    rows_out.append([
        "NA",                               # col1: Service_Name (filename2)
        r["provider_name"] or "NA",         # col2: provider_name (filename1)
        "NA",                               # col3: Physical_Address (filename2)
        r["formatted_address"] or "NA",     # col4: formatted_address (filename1)
        "NA",                               # col5: residential_places (filename2)
        r["res_places1"]                    # col6: residential_places (filename1)
    ])

# ---- Write CSV
with open(CSV, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f)
    w.writerow([
        "Service_Name (filename2)",
        "provider_name (filename1)",
        "Physical_Address (filename2)",
        "formatted_address (filename1)",
        "residential_places (filename2)",
        "residential_places (filename1)"
    ])
    w.writerows(rows_out)

print(f"Wrote review CSV -> {CSV}")
print(f"Filename2 (Residential-only) rows: {len(geo_rows)}")
print(f"Filename1 rows: {len(res_rows)}")
print(f"CSV rows (union with pairing): {len(rows_out)}")
PY

echo "Done."
