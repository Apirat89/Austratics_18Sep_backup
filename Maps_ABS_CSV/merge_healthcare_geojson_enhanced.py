#!/usr/bin/env python3
import json, argparse, os, sys

def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def to_int(val):
    try:
        if val is None: return None
        s = str(val).strip()
        if s == "": return None
        return int(s)
    except:
        return None

def norm_org_type(v):
    s = (v or "").strip().lower()
    if s in {"not for profit","not-for-profit","charitable","charity"}:
        return "Charitable"
    if s in {"state government","government","gov","public"}:
        return "State Government"
    if s in {"private","for profit","for-profit"}:
        return "Private"
    return v

def build_physical_address(street, suburb, state, postcode):
    parts = [p for p in [street, suburb, state, str(postcode) if postcode else None] if p]
    return ", ".join(parts) if parts else None

def feature_from_residential(rec):
    lat = rec.get("latitude")
    lon = rec.get("longitude")
    if lat is None or lon is None:
        return None
    postcode = rec.get("address_postcode")
    service_name = rec.get("Service Name") or rec.get("provider_name")
    props = {
        "Service_Name": service_name,
        "Physical_Address": rec.get("formatted_address") or build_physical_address(
            rec.get("address_street"), rec.get("address_locality"), rec.get("address_state"), postcode
        ),
        "Physical_Suburb": rec.get("address_locality"),
        "Physical_State": rec.get("address_state"),
        "Physical_Post_Code": to_int(postcode),
        "F2019_Aged_Care_Planning_Region": rec.get("star_Aged Care Planning Region"),
        "Care_Type": "Residential",
        "Residential_Places": rec.get("residential_places"),
        "Home_Care_Places": None,
        "Restorative_Care_Places": None,
        "Provider_Name": rec.get("ownership_details") or rec.get("star_Provider Name") or rec.get("provider_name"),
        "Organisation_Type": norm_org_type(rec.get("star_Purpose") or rec.get("ownership_details")),
        "ABS_Remoteness": None,
        "F2019_MMM_Code": rec.get("star_MMM Code"),
        "F2016_SA2_Code": None,
        "F2016_SA2_Name": None,
        "F2016_SA3_Code": None,
        "F2016_SA3_Name": None,
        "F2016_LGA_Code": None,
        "F2016_LGA_Name": None,
        "F2017_PHN_Code": None,
        "F2017_PHN_Name": None,
        "Latitude": lat,
        "Longitude": lon,
    }
    return {"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},"properties":props}

def feature_from_homecare(blob):
    p = blob.get("provider_info") or {}
    coords = p.get("coordinates") or {}
    addr = p.get("address") or {}
    fin = blob.get("finance_info") or {}
    lat = coords.get("latitude")
    lon = coords.get("longitude")
    if lat is None or lon is None:
        return None
    props = {
        "Service_Name": p.get("provider_name"),
        "Physical_Address": coords.get("formatted_address") or build_physical_address(
            addr.get("street"), addr.get("locality"), addr.get("state"), addr.get("postcode")
        ),
        "Physical_Suburb": addr.get("locality"),
        "Physical_State": addr.get("state"),
        "Physical_Post_Code": to_int(addr.get("postcode")),
        "F2019_Aged_Care_Planning_Region": None,   # don't incorrectly map service_area
        "Care_Type": "Home Care",
        "Residential_Places": None,
        "Home_Care_Places": None,
        "Restorative_Care_Places": None,
        "Provider_Name": fin.get("ownership_details") or p.get("provider_name"),
        "Organisation_Type": norm_org_type(p.get("organization_type")),
        "ABS_Remoteness": None,
        "F2019_MMM_Code": None,
        "F2016_SA2_Code": None,
        "F2016_SA2_Name": None,
        "F2016_SA3_Code": None,
        "F2016_SA3_Name": None,
        "F2016_LGA_Code": None,
        "F2016_LGA_Name": None,
        "F2017_PHN_Code": None,
        "F2017_PHN_Name": None,
        "Latitude": lat,
        "Longitude": lon,
    }
    return {"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},"properties":props}

def pass_through_healthcare(feat):
    """Passes through only NON-Residential and NON-Home Care features; also ensures Lat/Lon in properties."""
    props = dict(feat.get("properties") or {})
    care_type = (props.get("Care_Type") or "").strip().lower()
    if care_type in {"residential", "home care"}:
        return None  # exclude these; we'll replace with updated data
    geom = feat.get("geometry") or {}
    coords = geom.get("coordinates") or [None, None]
    if props.get("Latitude") is None and coords[1] is not None:
        props["Latitude"] = coords[1]
    if props.get("Longitude") is None and coords[0] is not None:
        props["Longitude"] = coords[0]
    return {"type":"Feature","geometry":geom,"properties":props}

def dedup_by_key(features):
    seen, out = set(), []
    for f in features:
        p = f["properties"]
        k = (p.get("Service_Name"), p.get("Provider_Name"), p.get("Physical_Address"))
        if k in seen:
            continue
        seen.add(k); out.append(f)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--healthcare", default="healthcare_simplified.geojson")
    ap.add_argument("--residential", default="Residential_May2025_ExcludeMPS_updated3.json")
    ap.add_argument("--homecare", default="merged_homecare_providers.json")
    ap.add_argument("--out", default="healthcare_merged.geojson")
    ap.add_argument("--no-dedup", action="store_true")
    args = ap.parse_args()

    hc = load_json(args.healthcare, {"type":"FeatureCollection","features":[]})
    res = load_json(args.residential, [])
    home = load_json(args.homecare, [])

    features = []

    # 1) Keep only non-Residential / non-Home Care from existing healthcare file
    for f in hc.get("features", []):
        kept = pass_through_healthcare(f)
        if kept: features.append(kept)

    # 2) Add updated Residential
    for r in res:
        f = feature_from_residential(r)
        if f: features.append(f)

    # 3) Add updated Home Care
    for h in home:
        f = feature_from_homecare(h)
        if f: features.append(f)

    # Optional: de-duplicate
    if not args.no_dedup:
        before = len(features)
        features = dedup_by_key(features)
        after = len(features)
        if after != before:
            print(f"Deduplicated {before - after} overlapping features.", file=sys.stderr)

    # Re-sequence OBJECTID/id
    out_features = []
    for i, f in enumerate(features, start=1):
        p = dict(f["properties"]); p["OBJECTID"] = i
        f_out = dict(f); f_out["properties"] = p; f_out["id"] = i
        out_features.append(f_out)

    fc = {"type":"FeatureCollection","features":out_features}
    with open(args.out,"w",encoding="utf-8") as f:
        json.dump(fc,f,ensure_ascii=False,indent=2)
    print(f"Wrote {len(out_features)} features to {args.out}")

if __name__ == "__main__":
    main()
