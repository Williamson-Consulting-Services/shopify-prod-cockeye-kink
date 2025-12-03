# Makefile Usage Guide

## Overview

The Makefile in `.upgrade-analysis/` provides simple commands to run all analysis steps for the Dawn upgrade.

## Quick Start

Run from the repository root:

```bash
# Show available commands
make -C .upgrade-analysis help

# Run complete analysis
make -C .upgrade-analysis all
```

## Available Commands

### Complete Analysis

```bash
make -C .upgrade-analysis all
```

Runs the complete analysis workflow:
1. Verify configuration
2. Fetch latest from upstream
3. Extract Dawn reference files
4. Generate all diff sets
5. Analyze JSON differences
6. Categorize file changes
7. Generate JSON patch files
8. Generate file patch files
9. Extract JSON changes
10. Generate documentation

### Individual Steps

You can also run individual steps:

```bash
# Verify version configuration
make -C .upgrade-analysis verify-config

# Fetch latest from upstream
make -C .upgrade-analysis fetch

# Extract Dawn reference files
make -C .upgrade-analysis extract-dawn

# Generate all diff sets
make -C .upgrade-analysis generate-diffs

# Analyze JSON differences
make -C .upgrade-analysis analyze-json

# Categorize file changes
make -C .upgrade-analysis categorize

# Generate JSON patch files
make -C .upgrade-analysis generate-json-patches

# Generate file patch files
make -C .upgrade-analysis generate-file-patches

# Extract JSON changes to separate files
make -C .upgrade-analysis extract-json-changes

# Generate documentation
make -C .upgrade-analysis generate-docs
```

### Cleanup

```bash
# Clean all generated files (asks for confirmation)
make -C .upgrade-analysis clean
```

## Configuration

All version references are configured in `.upgrade-analysis/version-config.json`.

To change target versions, edit that file and re-run the analysis.

## Output Files

After running `make all`, you'll have:

- `UPGRADE_CUSTOM_CHANGES.md` - Complete documentation of all changes
- `.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json` - Categorized inventory
- `.upgrade-analysis/reports/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json` - JSON analysis
- `.upgrade-analysis/json-patches/` - JSON patch files
- `.upgrade-analysis/patches/` - File patch files
- `.upgrade-analysis/diffs/` - All diff sets
- `.upgrade-analysis/dawn-10.0.0/` - Extracted Dawn 10.0.0 files
- `.upgrade-analysis/dawn-15.4.0/` - Extracted Dawn 15.4.0 files

## Dependencies

The Makefile assumes:
- Python 3 is available
- Scripts are in `scripts/` directory
- Git repository has upstream remote configured
- Virtual environment is set up (if needed)

## Troubleshooting

If you get path errors, make sure you're running from the repository root:

```bash
# Verify you're in the right place
pwd  # Should show the repository root
ls scripts/version_config.py  # Should exist
```

If configuration errors occur, verify the config file:

```bash
make -C .upgrade-analysis verify-config
```

