#!/usr/bin/env python3
"""
Generate human-readable markdown documentation from change analysis.

This script creates comprehensive documentation of all custom changes
for the Dawn 15.4 upgrade process.
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List, Any


def load_json(filepath: Path) -> Dict[str, Any] | List[Dict[str, Any]]:
    """Load JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def format_json_items(items: List[Dict]) -> str:
    """Format a list of JSON items for display in code block."""
    import json
    # Create clean representations
    display_items = []
    for item in items:
        display_item = {}
        for key in ['id', 'key', 'section', 'type', 'label', 'value', 'old_value', 'new_value', 'description']:
            if key in item:
                display_item[key] = item[key]
        display_items.append(display_item)
    return json.dumps(display_items, indent=2, ensure_ascii=False)


def format_settings_summary(json_changes: Dict, json_changes_dir: Path = None) -> str:
    """Format settings schema changes summary."""
    settings = json_changes.get('settings_schema', {})
    lines = []

    lines.append("### Settings Schema Changes\n")
    lines.append("All changes are documented in patch files using standard unified diff format.")
    lines.append("")

    lines.append("#### Our Customizations (v10.0.0 → v10_custom)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/config-settings_schema.json-custom.patch`")
    lines.append("- Shows what we added/changed from Dawn 10.0.0")
    lines.append("- Lines starting with `-` are from Dawn 10.0.0 (base)")
    lines.append("- Lines starting with `+` are our custom changes")
    lines.append("")

    lines.append("#### Dawn's Updates (v10.0.0 → v15.4.0)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/config-settings_schema.json-dawn-updates.patch`")
    lines.append("- Shows what Dawn changed between 10.0.0 and 15.4.0")
    lines.append("- **Important:** These Dawn updates need to be applied to bring settings_schema.json up to date")
    lines.append("- Look for key name changes here first, then apply the same changes to our customizations")
    lines.append("")

    # Theme info changes
    if settings.get('theme_info_changes'):
        version_change = settings['theme_info_changes'].get('v10_custom', {})
        if version_change:
            lines.append(f"**Version Change:** {version_change.get('old')} → {version_change.get('new')}")

    return "\n".join(lines)


def format_settings_data_summary(json_changes: Dict, json_changes_dir: Path = None) -> str:
    """Format settings_data changes summary."""
    lines = []

    lines.append("### Settings Data Changes\n")
    lines.append("All changes are documented in patch files using standard unified diff format.")
    lines.append("")

    lines.append("#### Our Customizations (v10.0.0 → v10_custom)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/config-settings_data.json-custom.patch`")
    lines.append("- Shows what we added/changed from Dawn 10.0.0")
    lines.append("- Lines starting with `-` are from Dawn 10.0.0 (base)")
    lines.append("- Lines starting with `+` are our custom changes")
    lines.append("")

    lines.append("#### Dawn's Updates (v10.0.0 → v15.4.0)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/config-settings_data.json-dawn-updates.patch`")
    lines.append("- Shows what Dawn changed between 10.0.0 and 15.4.0")
    lines.append("- **Important:** These Dawn updates need to be applied to bring settings_data.json up to date")
    lines.append("- Look for key name changes here first, then apply the same changes to our customizations")
    lines.append("")

    return "\n".join(lines)


def format_locale_summary(json_changes: Dict, json_changes_dir: Path = None) -> str:
    """Format locale changes summary."""
    lines = []

    lines.append("### English Locale Changes\n")
    lines.append("All changes are documented in patch files using standard unified diff format.")
    lines.append("")

    lines.append("#### Our Customizations (v10.0.0 → v10_custom)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/locales-en.default.json-custom.patch`")
    lines.append("- Shows what we added/changed from Dawn 10.0.0")
    lines.append("- Lines starting with `-` are from Dawn 10.0.0 (base)")
    lines.append("- Lines starting with `+` are our custom changes")
    lines.append("")

    lines.append("#### Dawn's Updates (v10.0.0 → v15.4.0)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/locales-en.default.json-dawn-updates.patch`")
    lines.append("- Shows what Dawn changed between 10.0.0 and 15.4.0")
    lines.append("- **Important:** These Dawn updates need to be applied to bring locale files up to date")
    lines.append("- Look for key name changes here first, then apply the same changes to our customizations")
    lines.append("")

    return "\n".join(lines)


def format_locale_schema_summary(json_changes: Dict, json_changes_dir: Path = None) -> str:
    """Format locale schema changes summary."""
    lines = []

    lines.append("### English Locale Schema Changes\n")
    lines.append("All changes are documented in patch files using standard unified diff format.")
    lines.append("")

    lines.append("#### Our Customizations (v10.0.0 → v10_custom)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/locales-en.default.schema.json-custom.patch`")
    lines.append("- Shows what we added/changed from Dawn 10.0.0")
    lines.append("- Lines starting with `-` are from Dawn 10.0.0 (base)")
    lines.append("- Lines starting with `+` are our custom changes")
    lines.append("")

    lines.append("#### Dawn's Updates (v10.0.0 → v15.4.0)")
    lines.append("Patch file: `.upgrade-analysis/json-patches/locales-en.default.schema.json-dawn-updates.patch`")
    lines.append("- Shows what Dawn changed between 10.0.0 and 15.4.0")
    lines.append("- **Important:** These Dawn updates need to be applied to bring locale schema files up to date")
    lines.append("- Look for key name changes here first, then apply the same changes to our customizations")
    lines.append("")

    return "\n".join(lines)


def format_custom_files(inventory: Dict) -> str:
    """Format custom files section."""
    custom_files = inventory.get('custom_files', {})
    lines = []

    lines.append("## Custom Files\n")
    lines.append("Files that were added and do not exist in Dawn 10.0.0.\n")

    for category, files in custom_files.items():
        if files:
            lines.append(f"### {category.capitalize()}")
            lines.append("Action: COPY from develop to Dawn 15.4.0\n")
            for idx, file_info in enumerate(files, 1):
                lines.append(f"{idx}. **{file_info['path']}**")
                lines.append(f"   - Action: COPY")
                lines.append(f"   - Type: {file_info['type']}")
                lines.append(f"   - Description: {file_info.get('description', 'N/A')}")
            lines.append("")

    return "\n".join(lines)


def format_modified_files(inventory: Dict) -> str:
    """Format modified Dawn files section."""
    modified = inventory.get('modified_dawn_files', {})
    lines = []

    lines.append("## Modified Dawn Files\n")
    lines.append("Dawn 10.0.0 files that were modified with custom changes.\n")

    # Group by directory
    by_dir = {}
    for filepath, file_info in modified.items():
        dir_path = str(Path(filepath).parent)
        if dir_path not in by_dir:
            by_dir[dir_path] = []
        by_dir[dir_path].append((filepath, file_info))

    # Separate files by action category
    files_to_revert = inventory.get('files_to_revert_to_clean', [])
    files_to_patch = inventory.get('files_to_patch_modified', [])

    # Group files by action category
    revert_files = {f: modified[f] for f in files_to_revert if f in modified}
    patch_files = {f: modified[f] for f in files_to_patch if f in modified}

    if revert_files:
        lines.append("### Files to REVERT to Clean Dawn 15.4.0")
        lines.append("These files should be reverted to clean Dawn 15.4.0 versions.")
        lines.append("Patch files show what customizations are being removed (lines with `-`).\n")
        for idx, (filepath, file_info) in enumerate(sorted(revert_files.items()), 1):
            safe_filename = filepath.replace('/', '-').replace('\\', '-')
            patch_file = f".upgrade-analysis/patches/{safe_filename}.patch"
            lines.append(f"{idx}. **{filepath}**")
            lines.append(f"   - Action: REVERT to clean Dawn 15.4.0")
            lines.append(f"   - Reason: {file_info.get('reason', 'Non-English locale - custom features only support English')}")
            lines.append(f"   - Patch file: `{patch_file}` (shows customizations being removed)")
        lines.append("")

    if patch_files:
        lines.append("### Files to PATCH_MODIFIED (Apply Customizations)")
        lines.append("These files need custom changes applied to Dawn 15.4.0 versions.\n")

        # Group by directory for patch files
        patch_by_dir = {}
        for filepath, file_info in patch_files.items():
            dir_path = str(Path(filepath).parent)
            if dir_path not in patch_by_dir:
                patch_by_dir[dir_path] = []
            patch_by_dir[dir_path].append((filepath, file_info))

        file_counter = 1
        for dir_path in sorted(patch_by_dir.keys()):
            lines.append(f"#### {dir_path}/")
            for filepath, file_info in patch_by_dir[dir_path]:
                safe_filename = filepath.replace('/', '-').replace('\\', '-')
                patch_file = f".upgrade-analysis/patches/{safe_filename}.patch"
                lines.append(f"\n{file_counter}. **{filepath}**")
                lines.append(f"   - Action: PATCH_MODIFIED")
                changes = file_info.get('changes', [])
                if changes:
                    lines.append(f"   - Changes: {len(changes)} modification(s)")
                    lines.append(f"   - Patch file: `{patch_file}` (shows customizations to apply)")
                    # Show brief summary (just first change as example)
                    if changes:
                        first_change = changes[0]
                        lines.append(f"   - Example: Line {first_change.get('line')}: {first_change.get('type')} - {first_change.get('content', '')[:60]}...")
                        if len(changes) > 1:
                            lines.append(f"   - See patch file for all {len(changes)} changes with full context")

                integration_points = file_info.get('integration_points', [])
                if integration_points:
                    lines.append(f"   - Integration Points: {len(integration_points)}")
                    for idx, point in enumerate(integration_points[:2], 1):
                        lines.append(f"     {idx}. {point}")
                    if len(integration_points) > 2:
                        lines.append(f"     {len(integration_points) - 1}. ... and {len(integration_points) - 2} more")
                file_counter += 1
            lines.append("")

    return "\n".join(lines)


def format_removed_files(inventory: Dict) -> str:
    """Format removed Dawn files section."""
    removed = inventory.get('removed_dawn_files', [])
    lines = []

    lines.append("## Removed Dawn Files\n")
    lines.append("Dawn 10.0.0 files that were removed. Categorized by action needed.\n")

    if removed:
        to_restore = [f for f in removed if f.get('should_restore')]
        to_accept_dawn = [f for f in removed if f.get('accept_dawn_15_4')]

        if to_restore:
            lines.append("### Files to Restore (moved to separate section below)")
            for idx, file_info in enumerate(to_restore, 1):
                lines.append(f"{idx}. `{file_info['path']}`")
            lines.append("")

        if to_accept_dawn:
            to_patch = [f for f in to_accept_dawn if f.get('has_customizations')]
            to_accept_clean = [f for f in to_accept_dawn if not f.get('has_customizations')]

            if to_patch:
                lines.append("### Files to Patch with Customizations")
                lines.append("These dev/config files had customizations before deletion.")
                lines.append("Accept Dawn 15.4.0 version and patch in customizations from diff.\n")
                for idx, file_info in enumerate(to_patch, 1):
                    lines.append(f"{idx}. `{file_info['path']}` - {file_info.get('description', '')}")
                lines.append("")

            if to_accept_clean:
                lines.append("### Files to Accept from Dawn 15.4.0 (no customizations)")
                lines.append("These dev/config files can accept Dawn 15.4.0 versions as-is.\n")
                for idx, file_info in enumerate(to_accept_clean, 1):
                    lines.append(f"{idx}. `{file_info['path']}` - {file_info.get('description', '')}")
    else:
        lines.append("No Dawn files were removed.")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description='Generate markdown documentation from change analysis')
    parser.add_argument('--inventory', required=True, help='Path to CUSTOM_CHANGES_INVENTORY.json')
    parser.add_argument('--json-changes', required=True, help='Path to CUSTOM_JSON_CHANGES.json')
    parser.add_argument('--output', required=True, help='Output markdown file path')
    parser.add_argument('--extract-json', action='store_true', help='Extract JSON changes to separate files')

    args = parser.parse_args()

    print("Loading inventory...")
    inventory = load_json(Path(args.inventory))

    print("Loading JSON changes...")
    json_changes = load_json(Path(args.json_changes))

    # Extract JSON changes to separate files if requested
    if args.extract_json:
        print("Extracting JSON changes to separate files...")
        json_changes_dir = Path(".upgrade-analysis/json-changes")
        json_changes_dir.mkdir(parents=True, exist_ok=True)

        # Extract settings_schema
        if 'settings_schema' in json_changes:
            settings = json_changes['settings_schema']
            comp1 = settings.get('v10_upstream_vs_v10_custom', {})
            if comp1.get('custom_additions'):
                with open(json_changes_dir / 'settings_schema-additions.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
            if comp1.get('modifications'):
                with open(json_changes_dir / 'settings_schema-modifications.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)
            if comp1.get('removals'):
                with open(json_changes_dir / 'settings_schema-removals.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['removals'], f, indent=2, ensure_ascii=False)
            if comp1.get('custom_sections'):
                with open(json_changes_dir / 'settings_schema-custom-sections.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['custom_sections'], f, indent=2, ensure_ascii=False)

        # Extract locale
        if 'locale_en' in json_changes:
            locale = json_changes['locale_en']
            comp1 = locale.get('v10_upstream_vs_v10_custom', {})
            if comp1.get('custom_additions'):
                with open(json_changes_dir / 'locale_en-additions.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
            if comp1.get('modifications'):
                with open(json_changes_dir / 'locale_en-modifications.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)

        # Extract locale_schema
        if 'locale_en_schema' in json_changes:
            locale_schema = json_changes['locale_en_schema']
            comp1 = locale_schema.get('v10_upstream_vs_v10_custom', {})
            if comp1.get('custom_additions'):
                with open(json_changes_dir / 'locale_en_schema-additions.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['custom_additions'], f, indent=2, ensure_ascii=False)
            if comp1.get('modifications'):
                with open(json_changes_dir / 'locale_en_schema-modifications.json', 'w', encoding='utf-8') as f:
                    json.dump(comp1['modifications'], f, indent=2, ensure_ascii=False)

        print(f"  Extracted JSON changes to {json_changes_dir}")

    print("Generating documentation...")

    # Build markdown document - LLM-friendly format for plan creation
    lines = []
    lines.append("# Dawn 15.4 Upgrade - Custom Changes Analysis")
    lines.append("")
    lines.append("## Purpose")
    lines.append("")
    lines.append("This document provides a comprehensive inventory of all custom changes")
    lines.append("made to the Dawn 10.0.0 base theme. This analysis will be used to create")
    lines.append("Phase 2 plan for applying these changes to a clean Dawn 15.4.0 base.")
    lines.append("")
    lines.append("**Instructions for LLM:** Use this document to create a detailed plan file")
    lines.append("for Phase 2 that systematically applies all custom changes to Dawn 15.4.0.")
    lines.append("")

    # Patch File Format Explanation
    lines.append("## Patch File Format")
    lines.append("")
    lines.append("All changes (including JSON files) are documented using standard unified diff patch format.")
    lines.append("This provides a clear, easy-to-read view of what changed.")
    lines.append("")
    lines.append("### Understanding Patch Files")
    lines.append("")
    lines.append("Patch files use the standard unified diff format:")
    lines.append("")
    lines.append("- **Lines starting with `-`** = Removed or changed in the base version")
    lines.append("- **Lines starting with `+`** = Added or changed in the compare version")
    lines.append("- **Lines without prefix** = Context lines (unchanged)")
    lines.append("")
    lines.append("### JSON File Patches")
    lines.append("")
    lines.append("For JSON configuration files, we generate two types of patches:")
    lines.append("")
    lines.append("1. **`-custom.patch`** files: Show our customizations (Dawn 10.0.0 → v10_custom)")
    lines.append("   - Use these to see what we added/changed from Dawn 10.0.0")
    lines.append("")
    lines.append("2. **`-dawn-updates.patch`** files: Show Dawn's updates (Dawn 10.0.0 → Dawn 15.4.0)")
    lines.append("   - Use these to identify key name changes and updates")
    lines.append("   - **Important:** Look for key name changes here first")
    lines.append("   - Then apply the same changes to our customizations")
    lines.append("")
    lines.append("### Migration Strategy")
    lines.append("")
    lines.append("1. **First:** Review the `-dawn-updates.patch` file to identify key name changes")
    lines.append("   between Dawn 10.0.0 and 15.4.0")
    lines.append("")
    lines.append("2. **Then:** Review the `-custom.patch` file to see our customizations")
    lines.append("")
    lines.append("3. **Finally:** Apply our customizations to Dawn 15.4.0, updating any key names")
    lines.append("   that changed between versions")
    lines.append("")
    lines.append("### Patch File Locations")
    lines.append("")
    lines.append("- JSON patches: `.upgrade-analysis/json-patches/`")
    lines.append("- File patches: `.upgrade-analysis/patches/`")
    lines.append("")

    # Summary
    summary = inventory.get('summary', {})
    lines.append("## Executive Summary")
    lines.append("")
    lines.append(f"- **Custom files added:** {summary.get('custom_files_count', 0)}")
    lines.append(f"- **Dawn files modified:** {summary.get('modified_dawn_files_count', 0)}")
    lines.append(f"  - Files to revert to clean Dawn 15.4.0: {summary.get('files_to_revert_count', 0)} (non-English locales)")
    lines.append(f"  - Files to patch with customizations: {summary.get('files_to_patch_modified_count', 0)}")
    lines.append(f"- **Dawn files removed:** {summary.get('removed_dawn_files_count', 0)}")
    lines.append(f"  - Files to restore from Dawn 15.4.0: {summary.get('files_to_restore_count', 0)}")
    lines.append(f"  - Files to accept Dawn 15.4.0 versions: {summary.get('files_to_accept_dawn_15_4_count', 0)}")
    lines.append(f"    - Files to patch with customizations: {summary.get('files_to_patch_deleted_count', 0)}")
    lines.append("")

    # Validation section
    validation = summary.get('validation', {})
    if validation:
        lines.append("### Validation")
        lines.append("")
        if validation.get('modified_equals_revert_plus_patch'):
            lines.append("✓ Modified files = Revert + Patch (math checks out)")
        else:
            lines.append("✗ WARNING: Modified files don't equal Revert + Patch!")
        if validation.get('removed_equals_restore_plus_accept'):
            lines.append("✓ Removed files = Restore + Accept (math checks out)")
        else:
            lines.append("✗ WARNING: Removed files don't equal Restore + Accept!")
        lines.append("")
    lines.append("### Action Categories")
    lines.append("")
    lines.append("1. **COPY**: Custom files that need to be copied from develop to Dawn 15.4.0")
    lines.append("2. **MODIFY**: Dawn files that need custom changes applied")
    lines.append("3. **REVERT**: Modified files that should be reverted to clean Dawn 15.4.0 (non-English locales)")
    lines.append("4. **RESTORE**: Deleted Dawn files that should be restored from Dawn 15.4.0")
    lines.append("5. **ACCEPT_DAWN_15_4**: Deleted dev/config files - accept Dawn 15.4.0 versions (value-add)")
    lines.append("6. **PATCH_MODIFIED**: Modified Dawn files that need customizations applied (90 - 50 = 40 files)")
    lines.append("7. **PATCH_DELETED**: Deleted dev/config files that need customizations patched into Dawn 15.4.0 versions")
    lines.append("")

    # JSON Changes
    json_changes_dir = Path(".upgrade-analysis/json-changes")
    lines.append("## Configuration Changes")
    lines.append("")
    lines.append("> **Note:** All JSON changes are documented in patch files (`.upgrade-analysis/json-patches/`).")
    lines.append("> Patch files use standard unified diff format - lines starting with `-` are removed/changed,")
    lines.append("> lines starting with `+` are added/changed. This format is easier to read and apply.")
    lines.append("")
    lines.append(format_settings_summary(json_changes, json_changes_dir))
    lines.append("")
    lines.append(format_settings_data_summary(json_changes, json_changes_dir))
    lines.append("")
    lines.append(format_locale_summary(json_changes, json_changes_dir))
    lines.append("")
    lines.append(format_locale_schema_summary(json_changes, json_changes_dir))
    lines.append("")

    # Custom Files
    lines.append(format_custom_files(inventory))
    lines.append("")

    # Modified Files
    lines.append(format_modified_files(inventory))
    lines.append("")

    # Removed Files
    lines.append(format_removed_files(inventory))
    lines.append("")

    # Files to Revert
    files_to_revert = inventory.get('files_to_revert_to_clean', [])
    if files_to_revert:
        lines.append("## Files to Revert to Clean Dawn 15.4.0")
        lines.append("")
        lines.append("These files were modified but should be reverted to clean Dawn 15.4.0 versions")
        lines.append("because custom features only support English locale.")
        lines.append("")
        for idx, filepath in enumerate(sorted(files_to_revert), 1):
            lines.append(f"{idx}. `{filepath}`")
        lines.append("")

    # Files to Restore
    files_to_restore = inventory.get('files_to_restore_from_dawn', [])
    if files_to_restore:
        lines.append("## Files to Restore from Dawn 15.4.0")
        lines.append("")
        lines.append("These Dawn theme files were deleted but should be restored from Dawn 15.4.0.")
        lines.append("")
        for idx, filepath in enumerate(sorted(files_to_restore), 1):
            lines.append(f"{idx}. `{filepath}`")
        lines.append("")
    else:
        lines.append("## Files to Restore from Dawn 15.4.0")
        lines.append("")
        lines.append("No theme files need to be restored.")
        lines.append("")

    # Files to Patch
    files_to_patch = inventory.get('files_to_patch_with_customizations', [])
    if files_to_patch:
        lines.append("## Files to Patch with Customizations")
        lines.append("")
        lines.append("These dev/config files had customizations before deletion.")
        lines.append("Accept Dawn 15.4.0 version and patch in customizations from diff analysis.")
        lines.append("")
        for idx, filepath in enumerate(sorted(files_to_patch), 1):
            lines.append(f"{idx}. `{filepath}`")
        lines.append("")

    # Integration Points Summary
    lines.append("## Key Integration Points")
    lines.append("")
    lines.append("### Layout Integration (`layout/theme.liquid`)")
    lines.append("- Custom scripts loader in head section")
    lines.append("- Custom order banner before header")
    lines.append("- Custom checkout footer after footer")
    lines.append("")

    lines.append("### Section Integration")
    lines.append("- `sections/main-product.liquid`: Custom product form extension script")
    lines.append("- `sections/main-cart-items.liquid`: Custom property filtering and edit button")
    lines.append("")

    lines.append("### Snippet Integration")
    lines.append("- `snippets/cart-drawer.liquid`: Custom cart extension and property filtering")
    lines.append("")

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"\nDocumentation generated!")
    print(f"Results written to: {output_path}")


if __name__ == '__main__':
    main()

