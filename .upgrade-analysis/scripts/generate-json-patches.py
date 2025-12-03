#!/usr/bin/env python3
"""
Generate patch files for JSON files showing:
1. Our customizations: comparison_version vs current_custom
2. Dawn's updates: comparison_version vs destination_version

This provides a clear view of what changed using standard patch format.
Versions are loaded from .upgrade-analysis/version-config.json
"""

import subprocess
import argparse
from pathlib import Path
from typing import List
import sys

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from version_config import get_git_refs, get_version_info


def generate_patch_for_file(filepath: str, base_ref: str, compare_ref: str, output_file: Path, description: str = ""):
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
                # Add header comment explaining what this patch shows
                if description:
                    f.write(f"# {description}\n")
                    f.write(f"# Comparing: {base_ref} (base) vs {compare_ref} (compare)\n")
                    f.write(f"# File: {filepath}\n")
                    f.write("#\n")
                    f.write("# Lines starting with '-' are removed/changed in base\n")
                    f.write("# Lines starting with '+' are added/changed in compare\n")
                    f.write("#\n\n")
                f.write(result.stdout)
            return True
        return False
    except Exception as e:
        print(f"Error generating patch for {filepath}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Generate patch files for JSON configuration files')
    parser.add_argument('--config', default=None, help='Path to version-config.json (default: .upgrade-analysis/version-config.json)')
    parser.add_argument('--output-dir', required=True, help='Output directory for patch files')

    args = parser.parse_args()

    # Load version configuration
    try:
        git_refs = get_git_refs(args.config)
        version_info = get_version_info(args.config)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1

    comparison_ref = git_refs['comparison']
    destination_ref = git_refs['destination']
    current_ref = git_refs['current']

    comparison_ver = version_info['comparison']['dawn_base']
    destination_ver = version_info['destination']['dawn_base']

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # JSON files that need patches
    json_files = [
        'config/settings_schema.json',
        'config/settings_data.json',
        'locales/en.default.json',
        'locales/en.default.schema.json',
    ]

    print(f"Generating patch files for JSON configuration files...")
    print(f"  Comparison: Dawn {comparison_ver} ({comparison_ref})")
    print(f"  Destination: Dawn {destination_ver} ({destination_ref})")
    print(f"  Output directory: {output_dir}")
    print()

    generated = 0

    for filepath in json_files:
        safe_filename = filepath.replace('/', '-').replace('\\', '-')

        # 1. Our customizations: comparison_version vs current_custom
        patch_file = output_dir / f"{safe_filename}-custom.patch"
        if generate_patch_for_file(
            filepath,
            comparison_ref,
            current_ref,
            patch_file,
            description=f"Our customizations: Shows what we added/changed from Dawn {comparison_ver}"
        ):
            generated += 1
            print(f"  [CUSTOM] Generated: {patch_file.name}")

        # 2. Dawn's updates: comparison_version vs destination_version
        patch_file = output_dir / f"{safe_filename}-dawn-updates.patch"
        if generate_patch_for_file(
            filepath,
            comparison_ref,
            destination_ref,
            patch_file,
            description=f"Dawn's updates: Shows what Dawn changed between {comparison_ver} and {destination_ver}"
        ):
            generated += 1
            print(f"  [DAWN] Generated: {patch_file.name}")

    print(f"\nGenerated {generated} patch files in {output_dir}")
    return 0


if __name__ == '__main__':
    main()

