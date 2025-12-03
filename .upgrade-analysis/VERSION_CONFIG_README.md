# Version Configuration Guide

## Overview

All version references are now centralized in `.upgrade-analysis/version-config.json`. This makes it easy to change target versions by editing a single file.

## Configuration File

**Location:** `.upgrade-analysis/version-config.json`

### Structure

```json
{
  "current_version": {
    "dawn_base": "10.0.0",
    "custom_patch": "3",
    "full_version": "10.0.3",
    "description": "Our current custom version based on Dawn 10.0.0"
  },
  "comparison_version": {
    "dawn_base": "10.0.0",
    "git_ref": "v10.0.0",
    "description": "Original Dawn version we started from (for comparison)"
  },
  "destination_version": {
    "dawn_base": "15.4.0",
    "git_ref": "upstream/main",
    "description": "Target Dawn version to upgrade to (latest from upstream/main)",
    "note": "Using upstream/main to get latest fixes. The v15.4.0 tag had incorrect theme_version (15.3.0), which was corrected in upstream/main."
  },
  "git_config": {
    "upstream_remote": "upstream",
    "current_branch": "HEAD",
    "comparison_ref": "v10.0.0",
    "destination_ref": "upstream/main"
  }
}
```

## Changing Target Version

To upgrade to a different Dawn version, simply edit `.upgrade-analysis/version-config.json`:

1. **Update `destination_version.dawn_base`** - The version number (for documentation)
2. **Update `git_config.destination_ref`** - The git reference to use:
   - Use a tag: `v15.4.0`
   - Use upstream/main: `upstream/main` (recommended for latest fixes)
   - Use a specific commit: `upstream/abc123def`

3. **Update `destination_version.git_ref`** - Should match `git_config.destination_ref`

## Using the Config in Scripts

All analysis scripts now load versions from the config file:

```python
from version_config import get_git_refs, get_version_info

# Get git references
git_refs = get_git_refs()
# Returns: {
#   'current': 'HEAD',
#   'comparison': 'v10.0.0',
#   'destination': 'upstream/main',
#   'upstream_remote': 'upstream'
# }

# Get version info
version_info = get_version_info()
# Returns version details for current, comparison, and destination
```

## Scripts Updated

All these scripts now use the config file:

- ✅ `generate-all-diffs.py` - Generates all three diff sets
- ✅ `generate-json-patches.py` - Generates JSON patch files
- ✅ `generate-file-patches.py` - Generates file patch files
- ⚠️ `analyze-all-json-diffs.py` - Still takes file paths (needs manual extraction)
- ✅ `version_config.py` - Config loader utility

## Current Configuration

- **Current Version:** 10.0.3 (Dawn 10.0.0 + custom patch 3)
- **Comparison Version:** Dawn 10.0.0 (tag: v10.0.0)
- **Destination Version:** Dawn 15.4.0 (using `upstream/main` for latest fixes)

**Note:** Using `upstream/main` instead of tag `v15.4.0` because the tag had an incorrect theme_version (15.3.0), which was corrected in upstream/main.

## Re-running Analysis

After updating the config file, simply re-run the analysis scripts - they will automatically use the new version:

```bash
# Re-generate all diffs
python scripts/generate-all-diffs.py

# Re-generate JSON patches
python scripts/generate-json-patches.py --output-dir .upgrade-analysis/json-patches

# Re-generate file patches
python scripts/generate-file-patches.py --inventory .upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json --output-dir .upgrade-analysis/patches
```

