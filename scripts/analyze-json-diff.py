#!/usr/bin/env python3
"""
Analyze JSON differences between Dawn 10.0.0 and current develop branch.

This script performs deep comparison of JSON files to identify:
- Custom settings added to settings_schema.json
- Modified Dawn settings
- Removed Dawn settings
- Custom translation keys in English locale
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List, Any, Set
from deepdiff import DeepDiff


def load_json(filepath: Path) -> Dict[str, Any] | List[Dict[str, Any]]:
    """Load JSON file and return as dictionary or list."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        # Skip comment block at the start if present
        if content.strip().startswith('/*'):
            # Find the end of the comment block
            end_comment = content.find('*/')
            if end_comment != -1:
                content = content[end_comment + 2:].strip()
        return json.loads(content)


def find_setting_by_id(settings: List[Dict], setting_id: str) -> Dict[str, Any] | None:
    """Find a setting by its ID in a settings list."""
    for setting in settings:
        if setting.get('id') == setting_id:
            return setting
    return None


def analyze_settings_schema(dawn_settings: List, current_settings: List) -> Dict[str, Any]:
    """Analyze differences in settings_schema.json."""
    result = {
        "custom_additions": [],
        "modifications": [],
        "removals": [],
        "theme_info_changes": {},
        "custom_sections": []
    }
    
    # Find theme_info (first element)
    dawn_theme_info = next((item for item in dawn_settings if item.get('name') == 'theme_info'), {})
    current_theme_info = next((item for item in current_settings if item.get('name') == 'theme_info'), {})
    
    if dawn_theme_info.get('theme_version') != current_theme_info.get('theme_version'):
        result["theme_info_changes"]["theme_version"] = {
            "old": dawn_theme_info.get('theme_version'),
            "new": current_theme_info.get('theme_version')
        }
    
    # Create maps by section name
    dawn_sections_map = {item.get('name'): item for item in dawn_settings if item.get('name') != 'theme_info'}
    current_sections_map = {item.get('name'): item for item in current_settings if item.get('name') != 'theme_info'}
    
    # Find custom sections (in current but not in dawn)
    for section_name, section in current_sections_map.items():
        if section_name not in dawn_sections_map:
            result["custom_sections"].append({
                "name": section_name,
                "description": f"Custom section: {section_name}"
            })
            # Also add all settings in this section as custom additions
            for setting in section.get('settings', []):
                if setting.get('id'):
                    result["custom_additions"].append({
                        "id": setting.get('id'),
                        "section": section_name,
                        "type": setting.get('type'),
                        "label": setting.get('label', ''),
                        "description": f"Custom setting in {section_name}: {setting.get('label', setting.get('id'))}"
                    })
    
    # Compare settings within each section
    for section_name in dawn_sections_map.keys() & current_sections_map.keys():
        dawn_section = dawn_sections_map[section_name]
        current_section = current_sections_map[section_name]
        
        dawn_section_settings = dawn_section.get('settings', [])
        current_section_settings = current_section.get('settings', [])
        
        # Create maps by ID for settings in this section
        dawn_settings_map = {s.get('id'): s for s in dawn_section_settings if s.get('id')}
        current_settings_map = {s.get('id'): s for s in current_section_settings if s.get('id')}
        
        # Find additions (in current but not in dawn)
        for setting_id, setting in current_settings_map.items():
            if setting_id not in dawn_settings_map:
                result["custom_additions"].append({
                    "id": setting_id,
                    "section": section_name,
                    "type": setting.get('type'),
                    "label": setting.get('label', ''),
                    "description": f"Custom setting in {section_name}: {setting.get('label', setting_id)}"
                })
        
        # Find removals (in dawn but not in current)
        for setting_id, setting in dawn_settings_map.items():
            if setting_id not in current_settings_map:
                result["removals"].append({
                    "id": setting_id,
                    "section": section_name,
                    "type": setting.get('type'),
                    "label": setting.get('label', ''),
                    "description": f"Removed Dawn setting from {section_name}: {setting.get('label', setting_id)}"
                })
        
        # Find modifications (in both but different)
        for setting_id in dawn_settings_map.keys() & current_settings_map.keys():
            dawn_setting = dawn_settings_map[setting_id]
            current_setting = current_settings_map[setting_id]
            
            # Use DeepDiff to find actual differences
            diff = DeepDiff(dawn_setting, current_setting, ignore_order=True, verbose_level=2)
            if diff:
                result["modifications"].append({
                    "id": setting_id,
                    "section": section_name,
                    "type": current_setting.get('type'),
                    "label": current_setting.get('label', ''),
                    "changes": str(diff),
                    "description": f"Modified Dawn setting in {section_name}: {current_setting.get('label', setting_id)}"
                })
    
    return result


def analyze_locale(dawn_locale: Dict, current_locale: Dict) -> Dict[str, Any]:
    """Analyze differences in locale JSON files."""
    result = {
        "custom_additions": [],
        "modifications": []
    }
    
    # Find keys in current but not in dawn (custom additions)
    for key, value in current_locale.items():
        if key not in dawn_locale:
            # Check if it's a custom key (starts with custom_)
            if key.startswith('custom_'):
                result["custom_additions"].append({
                    "key": key,
                    "value": value,
                    "description": f"Custom translation key: {key}"
                })
    
    # Find modifications
    for key in dawn_locale.keys() & current_locale.keys():
        if dawn_locale[key] != current_locale[key]:
            result["modifications"].append({
                "key": key,
                "old_value": dawn_locale[key],
                "new_value": current_locale[key],
                "description": f"Modified translation: {key}"
            })
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Analyze JSON differences between Dawn 10.0.0 and current branch')
    parser.add_argument('--dawn-settings', required=True, help='Path to Dawn 10.0.0 settings_schema.json')
    parser.add_argument('--current-settings', required=True, help='Path to current settings_schema.json')
    parser.add_argument('--dawn-locale', required=True, help='Path to Dawn 10.0.0 en.default.json')
    parser.add_argument('--current-locale', required=True, help='Path to current en.default.json')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    
    args = parser.parse_args()
    
    # Load JSON files
    print(f"Loading Dawn 10.0.0 settings from {args.dawn_settings}...")
    dawn_settings = load_json(Path(args.dawn_settings))
    
    print(f"Loading current settings from {args.current_settings}...")
    current_settings = load_json(Path(args.current_settings))
    
    print(f"Loading Dawn 10.0.0 locale from {args.dawn_locale}...")
    dawn_locale = load_json(Path(args.dawn_locale))
    
    print(f"Loading current locale from {args.current_locale}...")
    current_locale = load_json(Path(args.current_locale))
    
    # Analyze differences
    print("Analyzing settings_schema.json differences...")
    settings_analysis = analyze_settings_schema(dawn_settings, current_settings)
    
    print("Analyzing locale differences...")
    locale_analysis = analyze_locale(dawn_locale, current_locale)
    
    # Combine results
    result = {
        "settings_schema": settings_analysis,
        "locale_en": locale_analysis
    }
    
    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\nAnalysis complete!")
    print(f"  Custom settings added: {len(settings_analysis['custom_additions'])}")
    print(f"  Settings modified: {len(settings_analysis['modifications'])}")
    print(f"  Settings removed: {len(settings_analysis['removals'])}")
    print(f"  Custom locale keys added: {len(locale_analysis['custom_additions'])}")
    print(f"  Locale keys modified: {len(locale_analysis['modifications'])}")
    print(f"\nResults written to: {output_path}")


if __name__ == '__main__':
    main()

