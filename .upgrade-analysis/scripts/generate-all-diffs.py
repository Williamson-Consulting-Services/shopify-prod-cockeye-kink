#!/usr/bin/env python3
"""
Generate all three required diff sets for Dawn upgrade analysis:

1. comparison_version upstream vs current custom - Our customizations
2. current custom vs destination_version upstream - Potential conflicts
3. comparison_version upstream vs destination_version upstream - Dawn changes between versions

Versions are loaded from .upgrade-analysis/version-config.json
"""

import argparse
import subprocess
from pathlib import Path
import sys

# Add scripts directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))
from version_config import get_git_refs, get_version_info


def run_git_diff(base_ref: str, compare_ref: str, output_file: Path, description: str, file_pattern: str = None):
    """Run git diff and save to file."""
    print(f"Generating {description}...")
    print(f"  Comparing: {base_ref}..{compare_ref}")

    cmd = ['git', 'diff', f'{base_ref}..{compare_ref}']
    if file_pattern:
        cmd.extend(['--', file_pattern])

    with open(output_file, 'w', encoding='utf-8') as f:
        result = subprocess.run(
            cmd,
            stdout=f,
            stderr=subprocess.PIPE,
            text=True
        )

        if result.returncode != 0 and result.stderr:
            print(f"  Warning: {result.stderr}")

    size = output_file.stat().st_size
    print(f"  Output: {output_file} ({size:,} bytes)")
    return output_file.exists()


def run_git_diff_name_status(base_ref: str, compare_ref: str, output_file: Path):
    """Run git diff --name-status and save to file."""
    with open(output_file, 'w', encoding='utf-8') as f:
        subprocess.run(
            ['git', 'diff', '--name-status', f'{base_ref}..{compare_ref}'],
            stdout=f,
            stderr=subprocess.PIPE
        )
    return output_file.exists()


def main():
    parser = argparse.ArgumentParser(description='Generate all three diff sets for Dawn upgrade analysis')
    parser.add_argument('--output-dir', default='.upgrade-analysis/diffs', help='Output directory for diffs')
    parser.add_argument('--config', default=None, help='Path to version-config.json (default: .upgrade-analysis/version-config.json)')

    args = parser.parse_args()

    # Load version configuration
    try:
        git_refs = get_git_refs(args.config)
        version_info = get_version_info(args.config)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1

    current_ref = git_refs['current']
    comparison_ref = git_refs['comparison']
    destination_ref = git_refs['destination']

    current_ver = version_info['current']['full_version']
    comparison_ver = version_info['comparison']['dawn_base']
    destination_ver = version_info['destination']['dawn_base']

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print(f"Generating Three Diff Sets for Dawn {destination_ver} Upgrade Analysis")
    print("=" * 70)
    print()
    print(f"Current version: {current_ver}")
    print(f"Comparison version: Dawn {comparison_ver}")
    print(f"Destination version: Dawn {destination_ver} (using {destination_ref})")
    print()

    # Diff Set 1: comparison_version upstream vs current custom (our customizations)
    print("DIFF SET 1: Our Customizations")
    print("-" * 70)
    print(f"Purpose: Identify all custom changes made to Dawn {comparison_ver}")
    print(f"Base: {comparison_ref} (Dawn {comparison_ver} upstream)")
    print(f"Compare: {current_ref} (our custom develop branch)")
    print()

    run_git_diff_name_status(
        comparison_ref,
        current_ref,
        output_dir / '01-v10-upstream-vs-v10-custom-file-changes.txt'
    )

    run_git_diff(
        comparison_ref,
        current_ref,
        output_dir / '01-v10-upstream-vs-v10-custom-full-diff.patch',
        f'Full diff: {comparison_ver} upstream vs {current_ver} custom'
    )

    run_git_diff(
        comparison_ref,
        current_ref,
        output_dir / '01-v10-upstream-vs-v10-custom-liquid.patch',
        f'Liquid diff: {comparison_ver} upstream vs {current_ver} custom',
        '*.liquid'
    )

    run_git_diff(
        comparison_ref,
        current_ref,
        output_dir / '01-v10-upstream-vs-v10-custom-js.patch',
        f'JavaScript diff: {comparison_ver} upstream vs {current_ver} custom',
        '*.js'
    )

    run_git_diff(
        comparison_ref,
        current_ref,
        output_dir / '01-v10-upstream-vs-v10-custom-css.patch',
        f'CSS diff: {comparison_ver} upstream vs {current_ver} custom',
        '*.css'
    )

    run_git_diff(
        comparison_ref,
        current_ref,
        output_dir / '01-v10-upstream-vs-v10-custom-json.patch',
        f'JSON diff: {comparison_ver} upstream vs {current_ver} custom',
        '*.json'
    )

    print()

    # Diff Set 2: current custom vs destination upstream (potential conflicts)
    print("DIFF SET 2: Potential Conflicts")
    print("-" * 70)
    print(f"Purpose: Identify differences between our custom version and Dawn {destination_ver}")
    print("         This shows what conflicts we may encounter during merge")
    print(f"Base: {current_ref} (our custom develop branch)")
    print(f"Compare: {destination_ref} (Dawn {destination_ver} upstream)")
    print()

    run_git_diff_name_status(
        current_ref,
        destination_ref,
        output_dir / '02-v10-custom-vs-v15-upstream-file-changes.txt'
    )

    run_git_diff(
        current_ref,
        destination_ref,
        output_dir / '02-v10-custom-vs-v15-upstream-full-diff.patch',
        f'Full diff: {current_ver} custom vs {destination_ver} upstream'
    )

    run_git_diff(
        current_ref,
        destination_ref,
        output_dir / '02-v10-custom-vs-v15-upstream-liquid.patch',
        f'Liquid diff: {current_ver} custom vs {destination_ver} upstream',
        '*.liquid'
    )

    run_git_diff(
        current_ref,
        destination_ref,
        output_dir / '02-v10-custom-vs-v15-upstream-js.patch',
        f'JavaScript diff: {current_ver} custom vs {destination_ver} upstream',
        '*.js'
    )

    run_git_diff(
        current_ref,
        destination_ref,
        output_dir / '02-v10-custom-vs-v15-upstream-css.patch',
        f'CSS diff: {current_ver} custom vs {destination_ver} upstream',
        '*.css'
    )

    run_git_diff(
        current_ref,
        destination_ref,
        output_dir / '02-v10-custom-vs-v15-upstream-json.patch',
        f'JSON diff: {current_ver} custom vs {destination_ver} upstream',
        '*.json'
    )

    print()

    # Diff Set 3: comparison upstream vs destination upstream (Dawn changes)
    print("DIFF SET 3: Dawn Version Changes")
    print("-" * 70)
    print(f"Purpose: Identify all changes Dawn made between {comparison_ver} and {destination_ver}")
    print("         This shows what new features/updates we'll get from Dawn")
    print(f"Base: {comparison_ref} (Dawn {comparison_ver} upstream)")
    print(f"Compare: {destination_ref} (Dawn {destination_ver} upstream)")
    print()

    run_git_diff_name_status(
        comparison_ref,
        destination_ref,
        output_dir / '03-v10-upstream-vs-v15-upstream-file-changes.txt'
    )

    run_git_diff(
        comparison_ref,
        destination_ref,
        output_dir / '03-v10-upstream-vs-v15-upstream-full-diff.patch',
        f'Full diff: {comparison_ver} upstream vs {destination_ver} upstream'
    )

    run_git_diff(
        comparison_ref,
        destination_ref,
        output_dir / '03-v10-upstream-vs-v15-upstream-liquid.patch',
        f'Liquid diff: {comparison_ver} upstream vs {destination_ver} upstream',
        '*.liquid'
    )

    run_git_diff(
        comparison_ref,
        destination_ref,
        output_dir / '03-v10-upstream-vs-v15-upstream-js.patch',
        f'JavaScript diff: {comparison_ver} upstream vs {destination_ver} upstream',
        '*.js'
    )

    run_git_diff(
        comparison_ref,
        destination_ref,
        output_dir / '03-v10-upstream-vs-v15-upstream-css.patch',
        f'CSS diff: {comparison_ver} upstream vs {destination_ver} upstream',
        '*.css'
    )

    run_git_diff(
        comparison_ref,
        destination_ref,
        output_dir / '03-v10-upstream-vs-v15-upstream-json.patch',
        f'JSON diff: {comparison_ver} upstream vs {destination_ver} upstream',
        '*.json'
    )

    print()
    print("=" * 70)
    print("All diff sets generated successfully!")
    print("=" * 70)
    print()
    print("Summary:")
    print(f"  1. 01-*: Our customizations ({comparison_ver} upstream vs {current_ver} custom)")
    print(f"  2. 02-*: Potential conflicts ({current_ver} custom vs {destination_ver} upstream)")
    print(f"  3. 03-*: Dawn changes ({comparison_ver} upstream vs {destination_ver} upstream)")
    print()
    print(f"Output directory: {output_dir}")

    return 0


if __name__ == '__main__':
    main()

