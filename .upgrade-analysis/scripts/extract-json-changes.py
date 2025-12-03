#!/usr/bin/env python3
"""
Extract JSON changes into separate files for better organization.
"""

import json
import argparse
from pathlib import Path
from typing import Dict, Any


def load_json(filepath: Path) -> Dict[str, Any]:
    """Load JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_json_changes(json_changes: Dict, output_dir: Path):
    """Extract JSON changes into separate files."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Extract settings_schema changes
    if 'settings_schema' in json_changes:
        settings = json_changes['settings_schema']

        # Our customizations (v10_upstream_vs_v10_custom)
        comp1 = settings.get('v10_upstream_vs_v10_custom', {})
        if comp1.get('custom_additions'):
            with open(output_dir / 'settings_schema-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
        if comp1.get('modifications'):
            with open(output_dir / 'settings_schema-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)
        if comp1.get('removals'):
            with open(output_dir / 'settings_schema-removals.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['removals'], f, indent=2, ensure_ascii=False)
        if comp1.get('custom_sections'):
            with open(output_dir / 'settings_schema-custom-sections.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['custom_sections'], f, indent=2, ensure_ascii=False)

        # Dawn's updates (v10_upstream_vs_v15_upstream)
        comp2 = settings.get('v10_upstream_vs_v15_upstream', {})
        if comp2.get('dawn_additions'):
            with open(output_dir / 'settings_schema-dawn-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_additions'], f, indent=2, ensure_ascii=False)
        if comp2.get('dawn_modifications'):
            with open(output_dir / 'settings_schema-dawn-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_modifications'], f, indent=2, ensure_ascii=False)
        if comp2.get('dawn_removals'):
            with open(output_dir / 'settings_schema-dawn-removals.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_removals'], f, indent=2, ensure_ascii=False)

        # Potential conflicts (v10_custom_vs_v15_upstream)
        comp3 = settings.get('v10_custom_vs_v15_upstream', {})
        if comp3.get('conflict_additions'):
            with open(output_dir / 'settings_schema-conflict-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_additions'], f, indent=2, ensure_ascii=False)
        if comp3.get('conflict_modifications'):
            with open(output_dir / 'settings_schema-conflict-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_modifications'], f, indent=2, ensure_ascii=False)

    # Extract settings_data changes
    if 'settings_data' in json_changes:
        settings_data = json_changes['settings_data']

        # Our customizations
        comp1 = settings_data.get('v10_upstream_vs_v10_custom', {})
        if comp1.get('custom_additions'):
            with open(output_dir / 'settings_data-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
        if comp1.get('modifications'):
            with open(output_dir / 'settings_data-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)

        # Dawn's updates
        comp2 = settings_data.get('v10_upstream_vs_v15_upstream', {})
        if comp2.get('dawn_additions'):
            with open(output_dir / 'settings_data-dawn-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_additions'], f, indent=2, ensure_ascii=False)
        if comp2.get('dawn_modifications'):
            with open(output_dir / 'settings_data-dawn-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_modifications'], f, indent=2, ensure_ascii=False)

        # Potential conflicts
        comp3 = settings_data.get('v10_custom_vs_v15_upstream', {})
        if comp3.get('conflict_additions'):
            with open(output_dir / 'settings_data-conflict-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_additions'], f, indent=2, ensure_ascii=False)
        if comp3.get('conflict_modifications'):
            with open(output_dir / 'settings_data-conflict-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_modifications'], f, indent=2, ensure_ascii=False)

    # Extract locale changes
    if 'locale_en' in json_changes:
        locale = json_changes['locale_en']

        # Our customizations
        comp1 = locale.get('v10_upstream_vs_v10_custom', {})
        if comp1.get('custom_additions'):
            with open(output_dir / 'locale_en-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
        if comp1.get('modifications'):
            with open(output_dir / 'locale_en-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)

        # Dawn's updates
        comp2 = locale.get('v10_upstream_vs_v15_upstream', {})
        if comp2.get('dawn_additions'):
            with open(output_dir / 'locale_en-dawn-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_additions'], f, indent=2, ensure_ascii=False)
        if comp2.get('dawn_modifications'):
            with open(output_dir / 'locale_en-dawn-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_modifications'], f, indent=2, ensure_ascii=False)

        # Potential conflicts
        comp3 = locale.get('v10_custom_vs_v15_upstream', {})
        if comp3.get('conflict_additions'):
            with open(output_dir / 'locale_en-conflict-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_additions'], f, indent=2, ensure_ascii=False)
        if comp3.get('conflict_modifications'):
            with open(output_dir / 'locale_en-conflict-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_modifications'], f, indent=2, ensure_ascii=False)

    # Extract locale schema changes
    if 'locale_en_schema' in json_changes:
        locale_schema = json_changes['locale_en_schema']

        # Our customizations
        comp1 = locale_schema.get('v10_upstream_vs_v10_custom', {})
        if comp1.get('custom_additions'):
            with open(output_dir / 'locale_en_schema-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
        if comp1.get('modifications'):
            with open(output_dir / 'locale_en_schema-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)

        # Dawn's updates
        comp2 = locale_schema.get('v10_upstream_vs_v15_upstream', {})
        if comp2.get('dawn_additions'):
            with open(output_dir / 'locale_en_schema-dawn-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_additions'], f, indent=2, ensure_ascii=False)
        if comp2.get('dawn_modifications'):
            with open(output_dir / 'locale_en_schema-dawn-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp2['dawn_modifications'], f, indent=2, ensure_ascii=False)

        # Potential conflicts
        comp3 = locale_schema.get('v10_custom_vs_v15_upstream', {})
        if comp3.get('conflict_additions'):
            with open(output_dir / 'locale_en_schema-conflict-additions.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_additions'], f, indent=2, ensure_ascii=False)
        if comp3.get('conflict_modifications'):
            with open(output_dir / 'locale_en_schema-conflict-modifications.json', 'w', encoding='utf-8') as f:
                json.dump(comp3['conflict_modifications'], f, indent=2, ensure_ascii=False)

    print(f"Extracted JSON changes to {output_dir}")


def main():
    parser = argparse.ArgumentParser(description='Extract JSON changes into separate files')
    parser.add_argument('--json-changes', required=True, help='Path to CUSTOM_JSON_CHANGES.json')
    parser.add_argument('--output-dir', required=True, help='Output directory for JSON change files')

    args = parser.parse_args()

    print(f"Loading JSON changes from {args.json_changes}...")
    json_changes = load_json(Path(args.json_changes))

    output_dir = Path(args.output_dir)
    extract_json_changes(json_changes, output_dir)

    print("Done!")


if __name__ == '__main__':
    main()

