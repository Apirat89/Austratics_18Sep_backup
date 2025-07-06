#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def merge_sa2_postcode_data():
    # Define file paths
    data_dir = Path("/Users/apiratkongchanagul/AnalyticsCodeNew/Giantash/data/sa2")
    sa2_file = data_dir / "merged_sa2_data_comprehensive.json"
    postcode_file = Path("/Users/apiratkongchanagul/Analytics/DATA/Location_Mapping/postcodes_with_sa2.json")
    output_file = data_dir / "merged_sa2_data_with_postcodes.json"
    
    try:
        # Read the SA2 data file
        print("Reading SA2 data...")
        with open(sa2_file, 'r') as f:
            sa2_data = json.load(f)
        
        # Debug: Check the data structure
        print(f"SA2 data type: {type(sa2_data)}")
        if isinstance(sa2_data, list):
            print(f"SA2 data is a list with {len(sa2_data)} items")
            if len(sa2_data) > 0:
                print(f"First item type: {type(sa2_data[0])}")
                print(f"Sample SA2 ID: {sa2_data[0].get('id', 'NO_ID')} (type: {type(sa2_data[0].get('id'))})")
        elif isinstance(sa2_data, dict):
            print(f"SA2 data is a dict with keys: {list(sa2_data.keys())[:5]}...")
            
            # Check if it has a 'regions' key
            if 'regions' in sa2_data:
                print(f"Found 'regions' key with {len(sa2_data['regions'])} regions")
                sa2_data = sa2_data['regions']  # Extract the regions array
                if len(sa2_data) > 0:
                    print(f"Sample SA2 ID: {sa2_data[0].get('id', 'NO_ID')} (type: {type(sa2_data[0].get('id'))})")
            else:
                print(f"Sample SA2 ID: {sa2_data.get('id', 'NO_ID')} (type: {type(sa2_data.get('id'))})")
                # If it's a single dict, wrap it in a list
                sa2_data = [sa2_data]
        else:
            print(f"Unexpected SA2 data type: {type(sa2_data)}")
            return
        
        # Read the postcodes file (NDJSON format - one JSON object per line)
        print("Reading postcodes data...")
        postcode_data = []
        with open(postcode_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if line:  # Skip empty lines
                    try:
                        postcode_data.append(json.loads(line))
                    except json.JSONDecodeError as e:
                        print(f"Warning: Could not parse line {line_num}: {e}")
                        continue
        
        print(f"Loaded {len(postcode_data)} postcode records")
        if len(postcode_data) > 0:
            sample_pc = postcode_data[0]
            print(f"Sample postcode record keys: {list(sample_pc.keys())}")
            if "SA2_CODE_2021" in sample_pc:
                print(f"Sample SA2_CODE_2021: {sample_pc['SA2_CODE_2021']} (type: {type(sample_pc['SA2_CODE_2021'])})")
                if isinstance(sample_pc['SA2_CODE_2021'], list) and len(sample_pc['SA2_CODE_2021']) > 0:
                    print(f"First SA2 code: {sample_pc['SA2_CODE_2021'][0]} (type: {type(sample_pc['SA2_CODE_2021'][0])})")
        
        # Create lookup dictionary: SA2_CODE -> list of (locality, postcode) tuples
        print("Building lookup dictionary...")
        sa2_lookup = {}
        
        for record in postcode_data:
            locality = record.get("Locality", "")
            post_code = record.get("Post_Code", "")
            sa2_codes = record.get("SA2_CODE_2021", [])
            
            for sa2_code in sa2_codes:
                # Convert to string for consistent comparison
                sa2_code_str = str(sa2_code)
                if sa2_code_str not in sa2_lookup:
                    sa2_lookup[sa2_code_str] = []
                sa2_lookup[sa2_code_str].append({
                    "Locality": locality,
                    "Post_Code": post_code
                })
        
        print(f"Built lookup dictionary with {len(sa2_lookup)} SA2 codes")
        # Show a few sample SA2 codes from lookup
        sample_codes = list(sa2_lookup.keys())[:5]
        print(f"Sample SA2 codes in lookup: {sample_codes}")
        
        # Show first few SA2 IDs from the regions data
        print(f"First few SA2 IDs from regions data: {[str(record.get('id', 'NO_ID')) for record in sa2_data[:5]]}")
        
        # Process SA2 data and add postcode information
        print("Merging data...")
        matched_count = 0
        total_count = len(sa2_data)
        
        for i, record in enumerate(sa2_data):
            record_id = str(record.get("id", ""))
            
            if record_id in sa2_lookup:
                # Add postcode data to the record
                record["postcode_data"] = sa2_lookup[record_id]
                matched_count += 1
                
                # Show first few matches for debugging
                if matched_count <= 3:
                    print(f"Match #{matched_count}: SA2 ID {record_id} -> {len(record['postcode_data'])} postcode entries")
                    for pc_entry in record["postcode_data"][:2]:  # Show first 2 postcode entries
                        print(f"  Locality: {pc_entry['Locality']}, Post_Code: {pc_entry['Post_Code']}")
            else:
                # Add empty postcode data if no match found
                record["postcode_data"] = []
                
                # Show first few non-matches for debugging
                if (total_count - matched_count) <= 3 and i < 10:
                    print(f"No match for SA2 ID: {record_id}")
        
        # Write the merged data to output file
        print(f"Writing merged data to {output_file}...")
        
        # Read the original file again to preserve structure
        with open(sa2_file, 'r') as f:
            original_data = json.load(f)
        
        # If original had 'regions' key, update that array
        if isinstance(original_data, dict) and 'regions' in original_data:
            original_data['regions'] = sa2_data
            output_data = original_data
        else:
            output_data = sa2_data
            
        with open(output_file, 'w') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"\nMerge completed successfully!")
        print(f"Total SA2 records: {total_count}")
        print(f"Records with postcode matches: {matched_count}")
        print(f"Records without matches: {total_count - matched_count}")
        print(f"Output saved to: {output_file}")
        
        # Show a sample of the final merged data
        if matched_count > 0:
            print(f"\nSample merged record:")
            for record in sa2_data:
                if record.get("postcode_data") and len(record["postcode_data"]) > 0:
                    print(f"ID: {record['id']}, Name: {record.get('name', 'N/A')}")
                    print(f"Postcode data: {record['postcode_data'][0]}")
                    break
        
    except FileNotFoundError as e:
        print(f"Error: Could not find file - {e}")
        print("Please check that both input files exist in the specified directories.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    merge_sa2_postcode_data()