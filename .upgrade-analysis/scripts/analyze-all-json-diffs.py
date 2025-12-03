#!/usr/bin/env python3
"""
Analyze JSON differences across all three comparison sets:

1. v10.0.0 upstream vs v10.0.0 custom (our customizations)
2. v10.0.0 upstream vs v15.4.0 upstream (Dawn changes)
3. v10.0.0 custom vs v15.4.0 upstream (potential conflicts)
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List, Any
from deepdiff import DeepDiff


def load_json(filepath: Path) -> Dict[str, Any] | List[Dict[str, Any]]:
    """Load JSON file and return as dictionary or list."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        # Skip comment block at the start if present
        if content.strip().startswith('/*'):
            end_comment = content.find('*/')
            if end_comment != -1:
                content = content[end_comment + 2:].strip()
        return json.loads(content)


def analyze_settings_schema(dawn_v10: List, current: List, dawn_v15: List) -> Dict[str, Any]:
    """Analyze differences in settings_schema.json across all three comparisons."""
    result = {
        "v10_upstream_vs_v10_custom": {
            "custom_additions": [],
            "modifications": [],
            "removals": [],
            "custom_sections": []
        },
        "v10_upstream_vs_v15_upstream": {
            "dawn_additions": [],
            "dawn_modifications": [],
            "dawn_removals": []
        },
        "v10_custom_vs_v15_upstream": {
            "conflict_additions": [],
            "conflict_modifications": [],
            "conflict_removals": []
        },
        "theme_info_changes": {}
    }

    # Find theme_info
    v10_theme_info = next((item for item in dawn_v10 if item.get('name') == 'theme_info'), {})
    current_theme_info = next((item for item in current if item.get('name') == 'theme_info'), {})
    v15_theme_info = next((item for item in dawn_v15 if item.get('name') == 'theme_info'), {})

    # Theme version changes
    if v10_theme_info.get('theme_version') != current_theme_info.get('theme_version'):
        result["theme_info_changes"]["v10_custom"] = {
            "old": v10_theme_info.get('theme_version'),
            "new": current_theme_info.get('theme_version'),
            "comparison": "v10_upstream_vs_v10_custom"
        }

    if v10_theme_info.get('theme_version') != v15_theme_info.get('theme_version'):
        result["theme_info_changes"]["v15_upstream"] = {
            "old": v10_theme_info.get('theme_version'),
            "new": v15_theme_info.get('theme_version'),
            "comparison": "v10_upstream_vs_v15_upstream"
        }

    # Create maps by section name
    v10_sections = {item.get('name'): item for item in dawn_v10 if item.get('name') != 'theme_info'}
    current_sections = {item.get('name'): item for item in current if item.get('name') != 'theme_info'}
    v15_sections = {item.get('name'): item for item in dawn_v15 if item.get('name') != 'theme_info'}

    # Comparison 1: v10 upstream vs v10 custom (our customizations)
    for section_name in current_sections.keys():
        if section_name not in v10_sections:
            result["v10_upstream_vs_v10_custom"]["custom_sections"].append({
                "name": section_name,
                "comparison": "v10_upstream_vs_v10_custom",
                "description": f"Custom section: {section_name}"
            })
            for setting in current_sections[section_name].get('settings', []):
                if setting.get('id'):
                    result["v10_upstream_vs_v10_custom"]["custom_additions"].append({
                        "id": setting.get('id'),
                        "section": section_name,
                        "comparison": "v10_upstream_vs_v10_custom",
                        "type": setting.get('type'),
                        "label": setting.get('label', ''),
                        "description": f"Custom setting in {section_name}: {setting.get('label', setting.get('id'))}"
                    })

    # Compare settings within sections for v10 upstream vs v10 custom
    for section_name in v10_sections.keys() & current_sections.keys():
        v10_section = v10_sections[section_name]
        current_section = current_sections[section_name]

        v10_settings = {s.get('id'): s for s in v10_section.get('settings', []) if s.get('id')}
        current_settings = {s.get('id'): s for s in current_section.get('settings', []) if s.get('id')}

        # Additions in current
        for setting_id, setting in current_settings.items():
            if setting_id not in v10_settings:
                result["v10_upstream_vs_v10_custom"]["custom_additions"].append({
                    "id": setting_id,
                    "section": section_name,
                    "comparison": "v10_upstream_vs_v10_custom",
                    "type": setting.get('type'),
                    "label": setting.get('label', ''),
                    "description": f"Custom setting in {section_name}: {setting.get('label', setting_id)}"
                })

        # Modifications
        for setting_id in v10_settings.keys() & current_settings.keys():
            diff = DeepDiff(v10_settings[setting_id], current_settings[setting_id], ignore_order=True, verbose_level=2)
            if diff:
                result["v10_upstream_vs_v10_custom"]["modifications"].append({
                    "id": setting_id,
                    "section": section_name,
                    "comparison": "v10_upstream_vs_v10_custom",
                    "type": current_settings[setting_id].get('type'),
                    "label": current_settings[setting_id].get('label', ''),
                    "changes": str(diff),
                    "description": f"Modified Dawn setting in {section_name}: {current_settings[setting_id].get('label', setting_id)}"
                })

    # Comparison 2: v10 upstream vs v15 upstream (Dawn changes)
    for section_name in v15_sections.keys():
        if section_name not in v10_sections:
            result["v10_upstream_vs_v15_upstream"]["dawn_additions"].append({
                "name": section_name,
                "comparison": "v10_upstream_vs_v15_upstream",
                "description": f"Dawn 15.4.0 added section: {section_name}"
            })

    for section_name in v10_sections.keys() & v15_sections.keys():
        v10_section = v10_sections[section_name]
        v15_section = v15_sections[section_name]

        v10_settings = {s.get('id'): s for s in v10_section.get('settings', []) if s.get('id')}
        v15_settings = {s.get('id'): s for s in v15_section.get('settings', []) if s.get('id')}

        # Dawn additions
        for setting_id, setting in v15_settings.items():
            if setting_id not in v10_settings:
                result["v10_upstream_vs_v15_upstream"]["dawn_additions"].append({
                    "id": setting_id,
                    "section": section_name,
                    "comparison": "v10_upstream_vs_v15_upstream",
                    "type": setting.get('type'),
                    "label": setting.get('label', ''),
                    "description": f"Dawn 15.4.0 added setting in {section_name}: {setting.get('label', setting_id)}"
                })

        # Dawn modifications
        for setting_id in v10_settings.keys() & v15_settings.keys():
            diff = DeepDiff(v10_settings[setting_id], v15_settings[setting_id], ignore_order=True, verbose_level=2)
            if diff:
                result["v10_upstream_vs_v15_upstream"]["dawn_modifications"].append({
                    "id": setting_id,
                    "section": section_name,
                    "comparison": "v10_upstream_vs_v15_upstream",
                    "type": v15_settings[setting_id].get('type'),
                    "label": v15_settings[setting_id].get('label', ''),
                    "changes": str(diff),
                    "description": f"Dawn 15.4.0 modified setting in {section_name}: {v15_settings[setting_id].get('label', setting_id)}"
                })

    # Comparison 3: v10 custom vs v15 upstream (potential conflicts)
    for section_name in v15_sections.keys():
        if section_name not in current_sections:
            result["v10_custom_vs_v15_upstream"]["conflict_additions"].append({
                "name": section_name,
                "comparison": "v10_custom_vs_v15_upstream",
                "description": f"Conflict: Dawn 15.4.0 has section {section_name} that we don't have"
            })

    for section_name in current_sections.keys() & v15_sections.keys():
        current_section = current_sections[section_name]
        v15_section = v15_sections[section_name]

        current_settings = {s.get('id'): s for s in current_section.get('settings', []) if s.get('id')}
        v15_settings = {s.get('id'): s for s in v15_section.get('settings', []) if s.get('id')}

        # Settings in v15 but not in current (Dawn added)
        for setting_id, setting in v15_settings.items():
            if setting_id not in current_settings:
                result["v10_custom_vs_v15_upstream"]["conflict_additions"].append({
                    "id": setting_id,
                    "section": section_name,
                    "comparison": "v10_custom_vs_v15_upstream",
                    "type": setting.get('type'),
                    "label": setting.get('label', ''),
                    "description": f"Conflict: Dawn 15.4.0 added setting {setting_id} in {section_name}"
                })

        # Settings in both but different (potential conflict)
        for setting_id in current_settings.keys() & v15_settings.keys():
            diff = DeepDiff(current_settings[setting_id], v15_settings[setting_id], ignore_order=True, verbose_level=2)
            if diff:
                result["v10_custom_vs_v15_upstream"]["conflict_modifications"].append({
                    "id": setting_id,
                    "section": section_name,
                    "comparison": "v10_custom_vs_v15_upstream",
                    "type": current_settings[setting_id].get('type'),
                    "label": current_settings[setting_id].get('label', ''),
                    "changes": str(diff),
                    "description": f"Conflict: Both we and Dawn 15.4.0 modified setting {setting_id} in {section_name}"
                })

    return result


def analyze_locale(dawn_v10: Dict, current: Dict, dawn_v15: Dict) -> Dict[str, Any]:
    """Analyze differences in locale JSON files across all three comparisons."""
    result = {
        "v10_upstream_vs_v10_custom": {
            "custom_additions": [],
            "modifications": []
        },
        "v10_upstream_vs_v15_upstream": {
            "dawn_additions": [],
            "dawn_modifications": []
        },
        "v10_custom_vs_v15_upstream": {
            "conflict_additions": [],
            "conflict_modifications": []
        }
    }

    # Comparison 1: v10 upstream vs v10 custom
    for key, value in current.items():
        if key not in dawn_v10:
            if key.startswith('custom_'):
                result["v10_upstream_vs_v10_custom"]["custom_additions"].append({
                    "key": key,
                    "value": value,
                    "comparison": "v10_upstream_vs_v10_custom",
                    "description": f"Custom translation key: {key}"
                })
        elif dawn_v10[key] != value:
            result["v10_upstream_vs_v10_custom"]["modifications"].append({
                "key": key,
                "old_value": dawn_v10[key],
                "new_value": value,
                "comparison": "v10_upstream_vs_v10_custom",
                "description": f"Modified translation: {key}"
            })

    # Comparison 2: v10 upstream vs v15 upstream
    for key, value in dawn_v15.items():
        if key not in dawn_v10:
            result["v10_upstream_vs_v15_upstream"]["dawn_additions"].append({
                "key": key,
                "value": value,
                "comparison": "v10_upstream_vs_v15_upstream",
                "description": f"Dawn 15.4.0 added translation key: {key}"
            })
        elif dawn_v10[key] != value:
            result["v10_upstream_vs_v15_upstream"]["dawn_modifications"].append({
                "key": key,
                "old_value": dawn_v10[key],
                "new_value": value,
                "comparison": "v10_upstream_vs_v15_upstream",
                "description": f"Dawn 15.4.0 modified translation: {key}"
            })

    # Comparison 3: v10 custom vs v15 upstream
    for key, value in dawn_v15.items():
        if key not in current:
            result["v10_custom_vs_v15_upstream"]["conflict_additions"].append({
                "key": key,
                "value": value,
                "comparison": "v10_custom_vs_v15_upstream",
                "description": f"Conflict: Dawn 15.4.0 has translation key {key} that we don't have"
            })
        elif current[key] != value:
            result["v10_custom_vs_v15_upstream"]["conflict_modifications"].append({
                "key": key,
                "our_value": current[key],
                "dawn_value": value,
                "comparison": "v10_custom_vs_v15_upstream",
                "description": f"Conflict: Both we and Dawn 15.4.0 modified translation {key}"
            })

    return result


def analyze_settings_data(dawn_v10: Dict, current: Dict, dawn_v15: Dict) -> Dict[str, Any]:
    """Analyze differences in settings_data.json across all three comparisons."""
    result = {
        "v10_upstream_vs_v10_custom": {
            "custom_additions": [],
            "modifications": []
        },
        "v10_upstream_vs_v15_upstream": {
            "dawn_additions": [],
            "dawn_modifications": []
        },
        "v10_custom_vs_v15_upstream": {
            "conflict_additions": [],
            "conflict_modifications": []
        }
    }

    # Comparison 1: v10 upstream vs v10 custom
    for key, value in current.items():
        if key not in dawn_v10:
            # Check if it's a custom setting (starts with custom_)
            if key.startswith('custom_'):
                result["v10_upstream_vs_v10_custom"]["custom_additions"].append({
                    "key": key,
                    "value": value,
                    "comparison": "v10_upstream_vs_v10_custom",
                    "description": f"Custom setting value: {key}"
                })
        elif dawn_v10[key] != value:
            # Only track modifications for custom settings or if value changed significantly
            if key.startswith('custom_') or isinstance(value, (dict, list)):
                result["v10_upstream_vs_v10_custom"]["modifications"].append({
                    "key": key,
                    "old_value": dawn_v10[key],
                    "new_value": value,
                    "comparison": "v10_upstream_vs_v10_custom",
                    "description": f"Modified setting value: {key}"
                })

    # Comparison 2: v10 upstream vs v15 upstream
    for key, value in dawn_v15.items():
        if key not in dawn_v10:
            result["v10_upstream_vs_v15_upstream"]["dawn_additions"].append({
                "key": key,
                "value": value,
                "comparison": "v10_upstream_vs_v15_upstream",
                "description": f"Dawn 15.4.0 added setting value: {key}"
            })
        elif dawn_v10[key] != value:
            result["v10_upstream_vs_v15_upstream"]["dawn_modifications"].append({
                "key": key,
                "old_value": dawn_v10[key],
                "new_value": value,
                "comparison": "v10_upstream_vs_v15_upstream",
                "description": f"Dawn 15.4.0 modified setting value: {key}"
            })

    # Comparison 3: v10 custom vs v15 upstream
    for key, value in dawn_v15.items():
        if key not in current:
            result["v10_custom_vs_v15_upstream"]["conflict_additions"].append({
                "key": key,
                "value": value,
                "comparison": "v10_custom_vs_v15_upstream",
                "description": f"Conflict: Dawn 15.4.0 has setting value {key} that we don't have"
            })
        elif current[key] != value:
            result["v10_custom_vs_v15_upstream"]["conflict_modifications"].append({
                "key": key,
                "our_value": current[key],
                "dawn_value": value,
                "comparison": "v10_custom_vs_v15_upstream",
                "description": f"Conflict: Both we and Dawn 15.4.0 modified setting value {key}"
            })

    return result


def main():
    parser = argparse.ArgumentParser(description='Analyze JSON differences across all three comparison sets')
    parser.add_argument('--v10-settings', required=True, help='Path to Dawn 10.0.0 settings_schema.json')
    parser.add_argument('--current-settings', required=True, help='Path to current settings_schema.json')
    parser.add_argument('--v15-settings', required=True, help='Path to Dawn 15.4.0 settings_schema.json')
    parser.add_argument('--v10-locale', required=True, help='Path to Dawn 10.0.0 en.default.json')
    parser.add_argument('--current-locale', required=True, help='Path to current en.default.json')
    parser.add_argument('--v15-locale', required=True, help='Path to Dawn 15.4.0 en.default.json')
    parser.add_argument('--v10-locale-schema', required=True, help='Path to Dawn 10.0.0 en.default.schema.json')
    parser.add_argument('--current-locale-schema', required=True, help='Path to current en.default.schema.json')
    parser.add_argument('--v15-locale-schema', required=True, help='Path to Dawn 15.4.0 en.default.schema.json')
    parser.add_argument('--v10-settings-data', required=True, help='Path to Dawn 10.0.0 settings_data.json')
    parser.add_argument('--current-settings-data', required=True, help='Path to current settings_data.json')
    parser.add_argument('--v15-settings-data', required=True, help='Path to Dawn 15.4.0 settings_data.json')
    parser.add_argument('--output', required=True, help='Output JSON file path')

    args = parser.parse_args()

    # Load JSON files
    print("Loading JSON files...")
    v10_settings = load_json(Path(args.v10_settings))
    current_settings = load_json(Path(args.current_settings))
    v15_settings = load_json(Path(args.v15_settings))
    v10_locale = load_json(Path(args.v10_locale))
    current_locale = load_json(Path(args.current_locale))
    v15_locale = load_json(Path(args.v15_locale))
    v10_locale_schema = load_json(Path(args.v10_locale_schema))
    current_locale_schema = load_json(Path(args.current_locale_schema))
    v15_locale_schema = load_json(Path(args.v15_locale_schema))
    v10_settings_data = load_json(Path(args.v10_settings_data))
    current_settings_data = load_json(Path(args.current_settings_data))
    v15_settings_data = load_json(Path(args.v15_settings_data))

    # Analyze differences
    print("Analyzing settings_schema.json across all three comparisons...")
    settings_analysis = analyze_settings_schema(v10_settings, current_settings, v15_settings)

    print("Analyzing settings_data.json across all three comparisons...")
    settings_data_analysis = analyze_settings_data(v10_settings_data, current_settings_data, v15_settings_data)

    print("Analyzing locale (en.default.json) across all three comparisons...")
    locale_analysis = analyze_locale(v10_locale, current_locale, v15_locale)

    print("Analyzing locale schema (en.default.schema.json) across all three comparisons...")
    locale_schema_analysis = analyze_locale(v10_locale_schema, current_locale_schema, v15_locale_schema)

    # Combine results
    result = {
        "settings_schema": settings_analysis,
        "settings_data": settings_data_analysis,
        "locale_en": locale_analysis,
        "locale_en_schema": locale_schema_analysis,
        "comparison_sets": {
            "v10_upstream_vs_v10_custom": "Our customizations (v10.0.0 upstream vs v10.0.0 custom)",
            "v10_upstream_vs_v15_upstream": "Dawn version changes (v10.0.0 upstream vs v15.4.0 upstream)",
            "v10_custom_vs_v15_upstream": "Potential conflicts (v10.0.0 custom vs v15.4.0 upstream)"
        }
    }

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nAnalysis complete!")
    print(f"\nComparison 1 (v10 upstream vs v10 custom):")
    print(f"  Custom settings added: {len(settings_analysis['v10_upstream_vs_v10_custom']['custom_additions'])}")
    print(f"  Settings modified: {len(settings_analysis['v10_upstream_vs_v10_custom']['modifications'])}")
    print(f"  Custom locale keys added: {len(locale_analysis['v10_upstream_vs_v10_custom']['custom_additions'])}")
    print(f"  Custom locale schema keys added: {len(locale_schema_analysis['v10_upstream_vs_v10_custom']['custom_additions'])}")
    print(f"  Custom settings_data values added: {len(settings_data_analysis['v10_upstream_vs_v10_custom']['custom_additions'])}")
    print(f"\nComparison 2 (v10 upstream vs v15 upstream):")
    print(f"  Dawn settings added: {len(settings_analysis['v10_upstream_vs_v15_upstream']['dawn_additions'])}")
    print(f"  Dawn settings modified: {len(settings_analysis['v10_upstream_vs_v15_upstream']['dawn_modifications'])}")
    print(f"  Dawn locale keys added: {len(locale_analysis['v10_upstream_vs_v15_upstream']['dawn_additions'])}")
    print(f"  Dawn locale schema keys added: {len(locale_schema_analysis['v10_upstream_vs_v15_upstream']['dawn_additions'])}")
    print(f"  Dawn settings_data values added: {len(settings_data_analysis['v10_upstream_vs_v15_upstream']['dawn_additions'])}")
    print(f"\nComparison 3 (v10 custom vs v15 upstream):")
    print(f"  Conflict settings: {len(settings_analysis['v10_custom_vs_v15_upstream']['conflict_additions']) + len(settings_analysis['v10_custom_vs_v15_upstream']['conflict_modifications'])}")
    print(f"  Conflict locale keys: {len(locale_analysis['v10_custom_vs_v15_upstream']['conflict_additions']) + len(locale_analysis['v10_custom_vs_v15_upstream']['conflict_modifications'])}")
    print(f"  Conflict locale schema keys: {len(locale_schema_analysis['v10_custom_vs_v15_upstream']['conflict_additions']) + len(locale_schema_analysis['v10_custom_vs_v15_upstream']['conflict_modifications'])}")
    print(f"  Conflict settings_data values: {len(settings_data_analysis['v10_custom_vs_v15_upstream']['conflict_additions']) + len(settings_data_analysis['v10_custom_vs_v15_upstream']['conflict_modifications'])}")
    print(f"\nResults written to: {output_path}")


if __name__ == '__main__':
    main()

