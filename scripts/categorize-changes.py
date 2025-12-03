#!/usr/bin/env python3
"""
Categorize all changes between Dawn 10.0.0 and current develop branch.

This script parses git diff output to identify:
- Custom files (added files)
- Modified Dawn files
- Deleted Dawn files
- Integration points
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Set


def parse_file_changes(filepath: Path) -> Dict[str, List[str]]:
    """Parse file-changes.txt to categorize files."""
    result = {
        "added": [],
        "modified": [],
        "deleted": []
    }

    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            status = line[0]
            filepath_str = line[2:].strip()

            if status == 'A':
                result["added"].append(filepath_str)
            elif status == 'M':
                result["modified"].append(filepath_str)
            elif status == 'D':
                result["deleted"].append(filepath_str)

    return result


def parse_diff_patch(patch_file: Path) -> Dict[str, List[Dict[str, Any]]]:
    """Parse diff patch to extract line numbers and changes."""
    result = {}
    current_file = None
    current_changes = []
    line_num = None

    with open(patch_file, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            # Match file header: diff --git a/path b/path or +++ b/path
            if line.startswith('diff --git'):
                if current_file:
                    result[current_file] = current_changes
                # Extract filename
                match = re.search(r'^diff --git a/(.+?) b/(.+?)$', line)
                if match:
                    current_file = match.group(2)
                    current_changes = []
            elif line.startswith('+++ b/'):
                # Alternative file header
                current_file = line[6:].strip()
                if current_file == '/dev/null':
                    current_file = None
                current_changes = []
            elif line.startswith('@@'):
                # Match line numbers: @@ -old_start,old_count +new_start,new_count @@
                match = re.search(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', line)
                if match:
                    line_num = int(match.group(3))  # New file line number
            elif current_file and line_num is not None:
                if line.startswith('+') and not line.startswith('+++'):
                    # Added line
                    content = line[1:].rstrip()
                    if content and not content.startswith('---'):
                        current_changes.append({
                            "line": line_num,
                            "type": "addition",
                            "content": content[:200]  # Limit length
                        })
                        line_num += 1
                elif line.startswith('-') and not line.startswith('---'):
                    # Removed line (we track context)
                    line_num += 0  # Don't increment for removed lines
                elif line.startswith(' '):
                    # Context line
                    line_num += 1

    if current_file:
        result[current_file] = current_changes

    return result


def categorize_files(file_changes: Dict[str, List[str]], full_diff_path: Path = None, diff_set_1: Dict = None, diff_set_2: Dict = None, diff_set_3: Dict = None) -> Dict[str, Any]:
    """Categorize files into custom, modified Dawn, etc."""
    custom_files = {
        "assets": [],
        "snippets": [],
        "templates": [],
        "sections": [],
        "layout": [],
        "other": []
    }

    modified_dawn_files = {}
    removed_dawn_files = []

    # Custom files (added)
    for filepath in file_changes["added"]:
        path_parts = Path(filepath).parts
        comparisons = []
        if diff_set_1 and filepath in diff_set_1.get("added", []):
            comparisons.append("v10_upstream_vs_v10_custom")
        if diff_set_2 and filepath in diff_set_2.get("added", []):
            comparisons.append("v10_custom_vs_v15_upstream")
        if diff_set_3 and filepath in diff_set_3.get("added", []):
            comparisons.append("v10_upstream_vs_v15_upstream")

        file_info = {
            "path": filepath,
            "type": Path(filepath).suffix[1:] if Path(filepath).suffix else "unknown",
            "description": f"Custom {Path(filepath).name}",
            "comparisons": comparisons if comparisons else ["v10_upstream_vs_v10_custom"]
        }

        if filepath.startswith('assets/'):
            custom_files["assets"].append(file_info)
        elif filepath.startswith('snippets/'):
            custom_files["snippets"].append(file_info)
        elif filepath.startswith('templates/'):
            custom_files["templates"].append(file_info)
        elif filepath.startswith('sections/'):
            custom_files["sections"].append(file_info)
        elif filepath.startswith('layout/'):
            custom_files["layout"].append(file_info)
        else:
            custom_files["other"].append(file_info)

    # Modified Dawn files
    # Mark non-English locale files and README.md as "revert_to_clean"
    # - Non-English locales: we only support English
    # - README.md: accept Dawn 15.4.0 version (revert our changes)
    for filepath in file_changes["modified"]:
        revert_to_clean = False
        if filepath.startswith('locales/') and not filepath.startswith('locales/en.'):
            revert_to_clean = True
        elif filepath == 'README.md':
            revert_to_clean = True

        # Determine which comparisons this file appears in
        comparisons = []
        if diff_set_1 and filepath in diff_set_1.get("modified", []):
            comparisons.append("v10_upstream_vs_v10_custom")
        if diff_set_2 and filepath in diff_set_2.get("modified", []):
            comparisons.append("v10_custom_vs_v15_upstream")
        if diff_set_3 and filepath in diff_set_3.get("modified", []):
            comparisons.append("v10_upstream_vs_v15_upstream")

        # Set reason for revert files
        reason = None
        if revert_to_clean:
            if filepath == 'README.md':
                reason = "Accept Dawn 15.4.0 version (revert our customizations)"
            else:
                reason = "Non-English locale - custom features only support English"

        modified_dawn_files[filepath] = {
            "path": filepath,
            "changes": [],
            "integration_points": [],
            "revert_to_clean": revert_to_clean,
            "reason": reason,
            "comparisons": comparisons if comparisons else ["v10_upstream_vs_v10_custom"]
        }

    # Removed Dawn files - categorize into should_restore vs accept_dawn_15_4
    # Dev/config files should accept Dawn 15.4.0 versions (value-add)
    # But we need to check if we had customizations to patch in
    dev_config_files = [
        '.github/', '.gitignore', '.prettierrc.json', '.theme-check.yml',
        '.vscode/', 'LICENSE.md', 'release-notes.md', 'translation.yml'
    ]

    # Check full diff for any changes to these files before deletion
    full_diff_content = ""
    if full_diff_path and full_diff_path.exists():
        with open(full_diff_path, 'r', encoding='utf-8', errors='ignore') as f:
            full_diff_content = f.read()

    for filepath in file_changes["deleted"]:
        is_dev_config = False
        for pattern in dev_config_files:
            if filepath.startswith(pattern) or filepath == pattern:
                is_dev_config = True
                break

        # Check if file had customizations before deletion
        has_customizations = False
        if is_dev_config and full_diff_content:
            # Look for diff entries for this file (before it was deleted)
            # Pattern: diff --git a/path b/path or +++ b/path followed by changes
            file_pattern = filepath.replace('/', r'\/')
            if re.search(rf'diff --git.*{re.escape(filepath)}|^--- a/{re.escape(filepath)}|^\+\+\+ b/{re.escape(filepath)}', full_diff_content, re.MULTILINE):
                # Check if there are actual changes (not just deletion)
                diff_section = re.search(rf'(diff --git.*?{re.escape(filepath)}.*?)(?=diff --git|\Z)', full_diff_content, re.DOTALL)
                if diff_section:
                    section = diff_section.group(1)
                    # If there are additions or modifications (not just deletions), we had customizations
                    if re.search(r'^\+[^+]', section, re.MULTILINE):
                        has_customizations = True

        # Determine which comparisons this file appears in
        comparisons = []
        if diff_set_1 and filepath in diff_set_1.get("deleted", []):
            comparisons.append("v10_upstream_vs_v10_custom")
        if diff_set_2 and filepath in diff_set_2.get("deleted", []):
            comparisons.append("v10_custom_vs_v15_upstream")
        if diff_set_3 and filepath in diff_set_3.get("deleted", []):
            comparisons.append("v10_upstream_vs_v15_upstream")

        removed_dawn_files.append({
            "path": filepath,
            "should_restore": not is_dev_config,
            "accept_dawn_15_4": is_dev_config,
            "has_customizations": has_customizations if is_dev_config else False,
            "description": f"{'Accept Dawn 15.4.0 version' + (' (patch with customizations)' if has_customizations else '') if is_dev_config else 'Should restore'} Dawn file: {filepath}",
            "comparisons": comparisons if comparisons else ["v10_upstream_vs_v10_custom"]
        })

    return {
        "custom_files": custom_files,
        "modified_dawn_files": modified_dawn_files,
        "removed_dawn_files": removed_dawn_files
    }


def extract_integration_points(filepath: str, changes: List[Dict]) -> List[str]:
    """Extract integration points from file changes."""
    integration_points = []

    # Key patterns that indicate integration
    integration_patterns = [
        (r"render\s+['\"]custom-", "Custom snippet render"),
        (r"custom-.*\.js", "Custom JavaScript reference"),
        (r"component-custom-.*\.css", "Custom CSS reference"),
    ]

    for change in changes:
        content = change.get("content", "")
        for pattern, description in integration_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                integration_points.append(f"Line {change['line']}: {description}")
                break

    return integration_points


def main():
    parser = argparse.ArgumentParser(description='Categorize changes between Dawn 10.0.0 and current branch')
    parser.add_argument('--file-changes', required=True, help='Path to file-changes.txt')
    parser.add_argument('--full-diff', required=True, help='Path to full-diff.patch')
    parser.add_argument('--liquid-diff', help='Path to liquid-diff.patch')
    parser.add_argument('--js-diff', help='Path to js-diff.patch')
    parser.add_argument('--css-diff', help='Path to css-diff.patch')
    parser.add_argument('--json-changes', required=True, help='Path to CUSTOM_JSON_CHANGES.json')
    parser.add_argument('--diff-set-1', help='Path to diff set 1 file-changes (v10 upstream vs v10 custom)')
    parser.add_argument('--diff-set-2', help='Path to diff set 2 file-changes (v10 custom vs v15 upstream)')
    parser.add_argument('--diff-set-3', help='Path to diff set 3 file-changes (v10 upstream vs v15 upstream)')
    parser.add_argument('--output', required=True, help='Output JSON file path')

    args = parser.parse_args()

    print("Parsing file changes...")
    file_changes = parse_file_changes(Path(args.file_changes))

    # Parse all three diff sets for comparison labeling
    diff_set_1_changes = {}
    diff_set_2_changes = {}
    diff_set_3_changes = {}

    if args.diff_set_1:
        diff_set_1_changes = parse_file_changes(Path(args.diff_set_1))
        print(f"  Loaded diff set 1: {len(diff_set_1_changes['added']) + len(diff_set_1_changes['modified']) + len(diff_set_1_changes['deleted'])} changes")

    if args.diff_set_2:
        diff_set_2_changes = parse_file_changes(Path(args.diff_set_2))
        print(f"  Loaded diff set 2: {len(diff_set_2_changes['added']) + len(diff_set_2_changes['modified']) + len(diff_set_2_changes['deleted'])} changes")

    if args.diff_set_3:
        diff_set_3_changes = parse_file_changes(Path(args.diff_set_3))
        print(f"  Loaded diff set 3: {len(diff_set_3_changes['added']) + len(diff_set_3_changes['modified']) + len(diff_set_3_changes['deleted'])} changes")

    print("Categorizing files...")
    categorized = categorize_files(
        file_changes,
        Path(args.full_diff),
        diff_set_1_changes,
        diff_set_2_changes,
        diff_set_3_changes
    )

    print("Parsing diff patches...")
    full_diff = parse_diff_patch(Path(args.full_diff))

    # Enhance modified files with change details
    for filepath, file_info in categorized["modified_dawn_files"].items():
        if filepath in full_diff:
            file_info["changes"] = full_diff[filepath]
            file_info["integration_points"] = extract_integration_points(filepath, full_diff[filepath])

    # Load JSON changes reference
    with open(args.json_changes, 'r') as f:
        json_changes = json.load(f)

    # Combine results
    files_to_revert = [f for f, info in categorized["modified_dawn_files"].items() if info.get("revert_to_clean")]
    files_to_patch_modified = [f for f, info in categorized["modified_dawn_files"].items() if not info.get("revert_to_clean")]

    files_to_restore = [f["path"] for f in categorized["removed_dawn_files"] if f.get("should_restore")]
    files_to_accept_dawn_15_4 = [f["path"] for f in categorized["removed_dawn_files"] if f.get("accept_dawn_15_4")]
    files_to_patch_deleted = [f["path"] for f in categorized["removed_dawn_files"] if f.get("accept_dawn_15_4") and f.get("has_customizations")]

    # Validation: numbers should add up
    total_modified = len(categorized["modified_dawn_files"])
    total_to_revert = len(files_to_revert)
    total_to_patch_modified = len(files_to_patch_modified)

    if total_modified != (total_to_revert + total_to_patch_modified):
        print(f"WARNING: Modified files don't add up! Total: {total_modified}, Revert: {total_to_revert}, Patch: {total_to_patch_modified}")

    result = {
        "custom_files": categorized["custom_files"],
        "modified_dawn_files": categorized["modified_dawn_files"],
        "removed_dawn_files": categorized["removed_dawn_files"],
        "files_to_revert_to_clean": files_to_revert,
        "files_to_patch_modified": files_to_patch_modified,
        "files_to_restore_from_dawn": files_to_restore,
        "files_to_accept_dawn_15_4": files_to_accept_dawn_15_4,
        "files_to_patch_with_customizations": files_to_patch_deleted,
        "json_changes_reference": args.json_changes,
        "summary": {
            "custom_files_count": sum(len(files) for files in categorized["custom_files"].values()),
            "modified_dawn_files_count": total_modified,
            "removed_dawn_files_count": len(categorized["removed_dawn_files"]),
            "files_to_revert_count": total_to_revert,
            "files_to_patch_modified_count": total_to_patch_modified,
            "files_to_restore_count": len(files_to_restore),
            "files_to_accept_dawn_15_4_count": len(files_to_accept_dawn_15_4),
            "files_to_patch_deleted_count": len(files_to_patch_deleted),
            "validation": {
                "modified_equals_revert_plus_patch": total_modified == (total_to_revert + total_to_patch_modified),
                "removed_equals_restore_plus_accept": len(categorized["removed_dawn_files"]) == (len(files_to_restore) + len(files_to_accept_dawn_15_4))
            }
        }
    }

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\nCategorization complete!")
    print(f"  Custom files: {result['summary']['custom_files_count']}")
    print(f"  Modified Dawn files: {result['summary']['modified_dawn_files_count']}")
    print(f"  Removed Dawn files: {result['summary']['removed_dawn_files_count']}")
    print(f"\nResults written to: {output_path}")


if __name__ == '__main__':
    main()

