# Dawn Upgrade Analysis

This directory contains all analysis tools and outputs for the Dawn theme upgrade from version 10.0.0 to 15.4.0.

## Quick Start

Run the complete analysis from the repository root:

```bash
make -C .upgrade-analysis all
```

## Documentation

- **[MAKEFILE_README.md](./MAKEFILE_README.md)** - Complete guide to using the Makefile
- **[VERSION_CONFIG_README.md](./VERSION_CONFIG_README.md)** - How to configure and change versions
- **[RE_RUN_ANALYSIS.md](./RE_RUN_ANALYSIS.md)** - Steps to re-run analysis with corrected version
- **[SCRIPTS_UPDATED.md](./SCRIPTS_UPDATED.md)** - List of updated scripts

## Configuration

**Version Configuration:** `version-config.json`

All version references are centralized here. Edit this file to change target versions.

## Key Files

- `version-config.json` - Version configuration (comparison, destination, git refs)
- `Makefile` - Simple commands to run all analysis steps
- Analysis outputs in subdirectories:
  - `diffs/` - All diff sets
  - `reports/` - JSON inventory and analysis
  - `json-patches/` - JSON patch files
  - `patches/` - File patch files
  - `dawn-10.0.0/` - Extracted Dawn 10.0.0 files
  - `dawn-15.4.0/` - Extracted Dawn 15.4.0 files (from upstream/main)

## Available Commands

See all available commands:

```bash
make -C .upgrade-analysis help
```

Most common commands:

```bash
# Run complete analysis
make -C .upgrade-analysis all

# Verify configuration
make -C .upgrade-analysis verify-config

# Clean generated files
make -C .upgrade-analysis clean
```

## Current Configuration

- **Current Version:** 10.0.3 (Dawn 10.0.0 + custom patch 3)
- **Comparison Version:** Dawn 10.0.0 (tag: v10.0.0)
- **Destination Version:** Dawn 15.4.0 (using `upstream/main`)

**Note:** Using `upstream/main` instead of tag `v15.4.0` because the tag had an incorrect theme_version (15.3.0), which was corrected in upstream/main.

