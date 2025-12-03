# Re-running Analysis with Corrected Version

## Issue

The v15.4.0 tag has incorrect theme_version (15.3.0) in settings_schema.json. The corrected version is in `upstream/main`.

## Solution

Updated configuration to use `upstream/main` instead of `v15.4.0` tag.

## Configuration File

All version references are now in: `.upgrade-analysis/version-config.json`

**Current settings:**
- Comparison version: `v10.0.0` (Dawn 10.0.0)
- Destination version: `upstream/main` (Dawn 15.4.0 with corrected theme_version)

## Steps to Re-run Analysis

### 1. Fetch Latest Upstream

```bash
git fetch upstream main
git fetch upstream --tags
```

### 2. Verify Version

```bash
git show upstream/main:config/settings_schema.json | grep theme_version
# Should show: "theme_version": "15.4.0"
```

### 3. Re-generate All Diffs

```bash
python scripts/generate-all-diffs.py
```

This will generate three diff sets using versions from config:
- Set 1: Our customizations (v10.0.0 vs HEAD)
- Set 2: Potential conflicts (HEAD vs upstream/main)
- Set 3: Dawn changes (v10.0.0 vs upstream/main)

### 4. Extract Dawn Files for JSON Analysis

Use the extraction script (loads versions from config):
```bash
python scripts/extract-dawn-files.py
```

This will automatically extract files from:
- Comparison version (v10.0.0) → `.upgrade-analysis/dawn-10.0.0/`
- Destination version (upstream/main) → `.upgrade-analysis/dawn-15.4.0/`

### 5. Re-run JSON Analysis

```bash
python scripts/analyze-all-json-diffs.py \
  --v10-settings .upgrade-analysis/dawn-10.0.0/settings_schema.json \
  --current-settings config/settings_schema.json \
  --v15-settings .upgrade-analysis/dawn-15.4.0/settings_schema.json \
  --v10-locale .upgrade-analysis/dawn-10.0.0/en.default.json \
  --current-locale locales/en.default.json \
  --v15-locale .upgrade-analysis/dawn-15.4.0/en.default.json \
  --v10-locale-schema .upgrade-analysis/dawn-10.0.0/en.default.schema.json \
  --current-locale-schema locales/en.default.schema.json \
  --v15-locale-schema .upgrade-analysis/dawn-15.4.0/en.default.schema.json \
  --v10-settings-data .upgrade-analysis/dawn-10.0.0/settings_data.json \
  --current-settings-data config/settings_data.json \
  --v15-settings-data .upgrade-analysis/dawn-15.4.0/settings_data.json \
  --output .upgrade-analysis/reports/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json
```

### 6. Re-run Categorization

```bash
python scripts/categorize-changes.py \
  --file-changes .upgrade-analysis/diffs/01-v10-upstream-vs-v10-custom-file-changes.txt \
  --full-diff .upgrade-analysis/diffs/01-v10-upstream-vs-v10-custom-full-diff.patch \
  --liquid-diff .upgrade-analysis/diffs/01-v10-upstream-vs-v10-custom-liquid.patch \
  --js-diff .upgrade-analysis/diffs/01-v10-upstream-vs-v10-custom-js.patch \
  --css-diff .upgrade-analysis/diffs/01-v10-upstream-vs-v10-custom-css.patch \
  --json-changes .upgrade-analysis/reports/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json \
  --diff-set-1 .upgrade-analysis/diffs/01-v10-upstream-vs-v10-custom-file-changes.txt \
  --diff-set-2 .upgrade-analysis/diffs/02-v10-custom-vs-v15-upstream-file-changes.txt \
  --diff-set-3 .upgrade-analysis/diffs/03-v10-upstream-vs-v15-upstream-file-changes.txt \
  --output .upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json
```

### 7. Re-generate JSON Patches

```bash
python scripts/generate-json-patches.py --output-dir .upgrade-analysis/json-patches
```

### 8. Re-generate File Patches

```bash
python scripts/generate-file-patches.py \
  --inventory .upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json \
  --output-dir .upgrade-analysis/patches
```

### 9. Re-generate Documentation

```bash
python scripts/extract-json-changes.py \
  --json-changes .upgrade-analysis/reports/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json \
  --output-dir .upgrade-analysis/json-changes

python scripts/generate-diff-documentation.py \
  --inventory .upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json \
  --json-changes .upgrade-analysis/reports/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json \
  --output UPGRADE_CUSTOM_CHANGES.md \
  --extract-json
```

## Verification

After re-running, verify:
1. Settings schema shows correct theme_version in upstream/main patch files
2. All patch files reference correct version numbers
3. Documentation reflects upstream/main as destination

