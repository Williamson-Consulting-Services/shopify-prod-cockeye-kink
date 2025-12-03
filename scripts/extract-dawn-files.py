#!/usr/bin/env python3
"""
Extract Dawn reference files for JSON analysis.

Extracts files from git references defined in version-config.json.
"""

import subprocess
import argparse
from pathlib import Path
import sys

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from version_config import get_git_refs, get_version_info


def extract_file_from_git(git_ref: str, filepath: str, output_file: Path) -> bool:
    """Extract a file from a git reference."""
    try:
        result = subprocess.run(
            ['git', 'show', f'{git_ref}:{filepath}'],
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
        print(f"Error extracting {filepath} from {git_ref}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Extract Dawn reference files for analysis')
    parser.add_argument('--config', default=None, help='Path to version-config.json')
    parser.add_argument('--output-base', default='.upgrade-analysis', help='Base output directory')

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

    comparison_ver = version_info['comparison']['dawn_base']
    destination_ver = version_info['destination']['dawn_base']

    output_base = Path(args.output_base)

    # Files to extract
    files_to_extract = [
        'config/settings_schema.json',
        'config/settings_data.json',
        'locales/en.default.json',
        'locales/en.default.schema.json',
    ]

    print(f"Extracting Dawn reference files...")
    print(f"  Comparison version: Dawn {comparison_ver} ({comparison_ref})")
    print(f"  Destination version: Dawn {destination_ver} ({destination_ref})")
    print()

    extracted = 0

    # Extract comparison version files (use semantic name)
    for filepath in files_to_extract:
        safe_filename = filepath.replace('/', '-').replace('\\', '-')
        output_file = output_base / "dawn-comparison" / safe_filename

        if extract_file_from_git(comparison_ref, filepath, output_file):
            extracted += 1
            print(f"  [COMPARISON] Extracted: {filepath} → {output_file}")

    # Extract destination version files (use semantic name)
    for filepath in files_to_extract:
        safe_filename = filepath.replace('/', '-').replace('\\', '-')
        output_file = output_base / "dawn-destination" / safe_filename

        if extract_file_from_git(destination_ref, filepath, output_file):
            extracted += 1
            print(f"  [DESTINATION] Extracted: {filepath} → {output_file}")

    print(f"\nExtracted {extracted} files")
    return 0


if __name__ == '__main__':
    exit(main())

