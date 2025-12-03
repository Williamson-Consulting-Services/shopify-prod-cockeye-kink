# Upgrade Analysis Changelog

## Recent Changes

### Dynamic Version Configuration in Makefile

**Date:** Current

**Changes:**
- Makefile now dynamically reads version numbers from `version-config.json`
- No hardcoded version numbers in directory names or paths
- Uses semantic directory names (`dawn-comparison`, `dawn-destination`) instead of version-specific names
- Added `GET_VERSION` helper function in Makefile that calls `version_config.py`
- Version numbers are displayed in `make help` output

**Benefits:**
- Change target versions by editing only `version-config.json`
- Directory names don't need to change when versions change
- Cleaner, more maintainable configuration

### Git Ignore Configuration

**Changes:**
- Added analysis output directories to `.gitignore`
- Keeps configuration files and Makefile tracked in git
- All generated files are excluded

**Ignored:**
- `.upgrade-analysis/diffs/`
- `.upgrade-analysis/reports/`
- `.upgrade-analysis/dawn-*/` (all dawn version directories)
- `.upgrade-analysis/json-patches/`
- `.upgrade-analysis/patches/`
- `.upgrade-analysis/json-changes/`
- `UPGRADE_CUSTOM_CHANGES.md`

**Kept in Git:**
- `.upgrade-analysis/version-config.json`
- `.upgrade-analysis/Makefile`
- `.upgrade-analysis/README.md` and other documentation

### Enhanced version_config.py

**Changes:**
- Added `get_version_value(key)` function
- Can be called from command line: `python scripts/version_config.py <key>`
- Supports keys like:
  - `comparison.dawn_base`
  - `destination.dawn_base`
  - `comparison.git_ref`
  - `destination.git_ref`
  - `current.full_version`

**Usage in Makefile:**
```makefile
COMPARISON_VERSION := $(call GET_VERSION,comparison.dawn_base)
DESTINATION_VERSION := $(call GET_VERSION,destination.dawn_base)
```

## Directory Structure

All analysis outputs use semantic names that don't depend on version numbers:

- `dawn-comparison/` - Dawn comparison version files
- `dawn-destination/` - Dawn destination version files
- `diffs/` - All diff sets
- `reports/` - JSON inventory and analysis
- `json-patches/` - JSON patch files
- `patches/` - File patch files
- `json-changes/` - Extracted JSON changes

Version numbers are only used for:
- Display in help output
- Documentation
- Config file contents

