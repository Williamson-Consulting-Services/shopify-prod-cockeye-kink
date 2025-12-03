#!/usr/bin/env python3
"""
Generate individual patch files for each modified file.

For REVERT files: Generate patches comparing our custom version vs destination_version
                  (shows what we're removing)
For PATCH_MODIFIED files: Generate patches comparing comparison_version vs our custom version
                          (shows what we're adding)

Versions are loaded from .upgrade-analysis/version-config.json
"""

import subprocess
import argparse
from pathlib import Path
from typing import Dict, List
import sys

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from version_config import get_git_refs


def load_json(filepath: Path) -> Dict:
    """Load JSON file."""
    import json
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_patch_for_file(filepath: str, base_ref: str, compare_ref: str, output_file: Path):
    """Generate a patch file for a specific file."""
    try:
        # Generate unified diff for this specific file
        result = subprocess.run(
            ['git', 'diff', f'{base_ref}..{compare_ref}', '--', filepath],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0 and result.stdout.strip():
            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(result.stdout)
            return True
        return False
    except Exception as e:
        print(f"Error generating patch for {filepath}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Generate individual patch files for modified files')
    parser.add_argument('--inventory', required=True, help='Path to CUSTOM_CHANGES_INVENTORY.json')
    parser.add_argument('--config', default=None, help='Path to version-config.json (default: .upgrade-analysis/version-config.json)')
    parser.add_argument('--output-dir', required=True, help='Output directory for patch files')

    args = parser.parse_args()

    # Load version configuration
    try:
        git_refs = get_git_refs(args.config)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1

    comparison_ref = git_refs['comparison']
    destination_ref = git_refs['destination']
    current_ref = git_refs['current']

    print(f"Loading inventory from {args.inventory}...")
    inventory = load_json(Path(args.inventory))

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get files to revert and files to patch
    files_to_revert = inventory.get('files_to_revert_to_clean', [])
    files_to_patch = inventory.get('files_to_patch_modified', [])
    modified_files = inventory.get('modified_dawn_files', {})

    print(f"Generating patches for modified files...")
    print(f"  Comparison ref: {comparison_ref}")
    print(f"  Destination ref: {destination_ref}")
    print(f"  Current ref: {current_ref}")
    print(f"  - Files to REVERT: {len(files_to_revert)}")
    print(f"  - Files to PATCH_MODIFIED: {len(files_to_patch)}")

    generated_revert = 0
    generated_patch = 0

    # Generate patches for REVERT files (our custom vs destination - shows what we're removing)
    for filepath in files_to_revert:
        if filepath in modified_files:
            safe_filename = filepath.replace('/', '-').replace('\\', '-')
            patch_file = output_dir / f"{safe_filename}.patch"

            # Compare our custom version vs destination version
            # This shows: - lines = what we're removing (our customizations)
            #            + lines = what destination has (what we're adding back)
            if generate_patch_for_file(filepath, current_ref, destination_ref, patch_file):
                generated_revert += 1
                print(f"  [REVERT] Generated: {patch_file.name}")

    # Generate patches for PATCH_MODIFIED files (comparison vs our custom - shows what we're adding)
    for filepath in files_to_patch:
        if filepath in modified_files:
            safe_filename = filepath.replace('/', '-').replace('\\', '-')
            patch_file = output_dir / f"{safe_filename}.patch"

            # Compare comparison version vs our custom version
            # This shows what we're adding (our customizations)
            if generate_patch_for_file(filepath, comparison_ref, current_ref, patch_file):
                generated_patch += 1
                print(f"  [PATCH] Generated: {patch_file.name}")

    print(f"\nGenerated {generated_revert} REVERT patch files and {generated_patch} PATCH_MODIFIED patch files in {output_dir}")
    return 0


if __name__ == '__main__':
    main()

