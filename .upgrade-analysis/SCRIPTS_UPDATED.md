# Scripts Updated for Version Configuration

## Summary

All scripts have been updated to use centralized version configuration from `.upgrade-analysis/version-config.json`. This allows changing target versions by editing a single config file.

## Configuration File

**Location:** `.upgrade-analysis/version-config.json`

**Key Changes:**
- Destination version now uses `upstream/main` instead of `v15.4.0` tag
- Reason: The v15.4.0 tag had incorrect theme_version (15.3.0), corrected in upstream/main

## Updated Scripts

### ✅ Core Scripts

1. **`scripts/version_config.py`** (NEW)
   - Utility module to load version configuration
   - Functions: `get_git_refs()`, `get_version_info()`, `load_version_config()`
   - Used by all other scripts

2. **`scripts/generate-all-diffs.py`**
   - ✅ Now loads versions from config file
   - Uses `get_git_refs()` and `get_version_info()` from version_config
   - No longer has hardcoded version arguments

3. **`scripts/generate-json-patches.py`**
   - ✅ Now loads versions from config file
   - Generates patches using config-based git references

4. **`scripts/generate-file-patches.py`**
   - ✅ Now loads versions from config file
   - Generates patches for REVERT and PATCH_MODIFIED files

5. **`scripts/extract-dawn-files.py`** (NEW)
   - Extracts Dawn reference files using config
   - Automatically extracts from comparison and destination versions

### ⚠️ Scripts Still Using File Paths

These scripts take file paths as arguments (not git refs), so they don't need config:

- `scripts/analyze-all-json-diffs.py` - Takes file paths for JSON analysis
- `scripts/extract-json-changes.py` - Works with JSON files already extracted
- `scripts/categorize-changes.py` - Works with diff files already generated
- `scripts/generate-diff-documentation.py` - Works with inventory already created

## How to Change Versions

Simply edit `.upgrade-analysis/version-config.json`:

```json
{
  "destination_version": {
    "dawn_base": "15.4.0",  // Change version number here
    "git_ref": "upstream/main"  // Change git reference here
  },
  "git_config": {
    "destination_ref": "upstream/main"  // Must match git_ref above
  }
}
```

Then re-run the scripts - they will automatically use the new version.

## Verification

To verify config is working:

```bash
python scripts/version_config.py
```

This will display the loaded configuration and git references.

