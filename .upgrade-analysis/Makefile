# Makefile for Dawn Upgrade Analysis
# Simplifies running all analysis steps with correct version configuration
#
# Usage: Run from repository root directory
#   cd /path/to/repo
#   make -C .upgrade-analysis all
#
# Or use from .upgrade-analysis directory:
#   cd .upgrade-analysis
#   make all

.PHONY: help fetch extract-dawn generate-diffs analyze-json categorize generate-json-patches generate-file-patches extract-json-changes generate-docs clean all verify-config create-upgrade-branches apply-custom-files

# Paths are relative to repository root when using: make -C .upgrade-analysis
# Repository root is always parent directory when Makefile is in .upgrade-analysis/
ROOT_DIR := ..
SCRIPTS_DIR := $(ROOT_DIR)/scripts
CONFIG_FILE := $(ROOT_DIR)/.upgrade-analysis/version-config.json

# Configuration - paths relative to repository root
PYTHON := python3

# Helper function to get version values from config
GET_VERSION = $(shell cd $(ROOT_DIR) && $(PYTHON) scripts/version_config.py $(1))

# Dynamic paths using version config - use semantic names (comparison/destination)
DIFFS_DIR := $(ROOT_DIR)/.upgrade-analysis/diffs
REPORTS_DIR := $(ROOT_DIR)/.upgrade-analysis/reports
DAWN_COMPARISON_DIR := $(ROOT_DIR)/.upgrade-analysis/dawn-comparison
DAWN_DESTINATION_DIR := $(ROOT_DIR)/.upgrade-analysis/dawn-destination
JSON_PATCHES_DIR := $(ROOT_DIR)/.upgrade-analysis/json-patches
FILE_PATCHES_DIR := $(ROOT_DIR)/.upgrade-analysis/patches
JSON_CHANGES_DIR := $(ROOT_DIR)/.upgrade-analysis/json-changes
DOC_OUTPUT := $(ROOT_DIR)/UPGRADE_CUSTOM_CHANGES.md

# Version numbers (for reference/display only)
COMPARISON_VERSION := $(call GET_VERSION,comparison.dawn_base)
DESTINATION_VERSION := $(call GET_VERSION,destination.dawn_base)

# Default target
help:
	@echo "Dawn Upgrade Analysis - Available targets:"
	@echo ""
	@echo "  make all              - Run complete analysis (recommended)"
	@echo "  make verify-config    - Verify version configuration"
	@echo "  make fetch            - Fetch latest from upstream"
	@echo "  make extract-dawn     - Extract Dawn reference files"
	@echo "  make generate-diffs   - Generate all three diff sets"
	@echo "  make analyze-json     - Analyze JSON differences"
	@echo "  make categorize       - Categorize file changes"
	@echo "  make generate-json-patches - Generate JSON patch files"
	@echo "  make generate-file-patches - Generate file patch files"
	@echo "  make extract-json-changes - Extract JSON changes to separate files"
	@echo "  make generate-docs    - Generate documentation"
	@echo "  make clean            - Clean generated files (be careful!)"
	@echo ""
	@echo "Upgrade Workflow:"
	@echo "  make create-upgrade-branches - Create base and work branches"
	@echo "  make apply-custom-files      - Copy custom files to upgrade branch"
	@echo ""
	@echo "Configuration: $(CONFIG_FILE)"
	@echo "  Comparison: Dawn $(COMPARISON_VERSION)"
	@echo "  Destination: Dawn $(DESTINATION_VERSION)"
	@echo ""
	@echo "Note: Run from repository root using: make -C .upgrade-analysis <target>"
	@echo ""
	@echo "See .upgrade-analysis/MERGE_STRATEGY.md for complete upgrade workflow"

# Verify configuration file exists
verify-config:
	@echo "Verifying version configuration..."
	@test -f $(CONFIG_FILE) || (echo "Error: $(CONFIG_FILE) not found! Make sure you run from repository root using: make -C .upgrade-analysis <target>" && exit 1)
	@cd $(ROOT_DIR) && $(PYTHON) scripts/version_config.py

# Fetch latest from upstream
fetch:
	@echo "Fetching latest from upstream..."
	@cd $(ROOT_DIR) && git fetch upstream main
	@cd $(ROOT_DIR) && git fetch upstream --tags
	@echo "✓ Fetched latest upstream"

# Extract Dawn reference files
extract-dawn: verify-config
	@echo "Extracting Dawn reference files..."
	@cd $(ROOT_DIR) && $(PYTHON) scripts/extract-dawn-files.py
	@echo "✓ Extracted Dawn reference files"

# Generate all three diff sets
generate-diffs: verify-config
	@echo "Generating all diff sets..."
	@cd $(ROOT_DIR) && $(PYTHON) scripts/generate-all-diffs.py
	@echo "✓ Generated all diff sets"

# Analyze JSON differences
analyze-json: extract-dawn
	@echo "Analyzing JSON differences..."
	@cd $(ROOT_DIR) && $(PYTHON) scripts/analyze-all-json-diffs.py \
		--v10-settings $(DAWN_COMPARISON_DIR)/config-settings_schema.json \
		--current-settings config/settings_schema.json \
		--v15-settings $(DAWN_DESTINATION_DIR)/config-settings_schema.json \
		--v10-locale $(DAWN_COMPARISON_DIR)/locales-en.default.json \
		--current-locale locales/en.default.json \
		--v15-locale $(DAWN_DESTINATION_DIR)/locales-en.default.json \
		--v10-locale-schema $(DAWN_COMPARISON_DIR)/locales-en.default.schema.json \
		--current-locale-schema locales/en.default.schema.json \
		--v15-locale-schema $(DAWN_DESTINATION_DIR)/locales-en.default.schema.json \
		--v10-settings-data $(DAWN_COMPARISON_DIR)/config-settings_data.json \
		--current-settings-data config/settings_data.json \
		--v15-settings-data $(DAWN_DESTINATION_DIR)/config-settings_data.json \
		--output $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json
	@echo "✓ Analyzed JSON differences"

# Categorize file changes
categorize: generate-diffs analyze-json
	@echo "Categorizing file changes..."
	@cd $(ROOT_DIR) && $(PYTHON) scripts/categorize-changes.py \
		--file-changes $(DIFFS_DIR)/01-v10-upstream-vs-v10-custom-file-changes.txt \
		--full-diff $(DIFFS_DIR)/01-v10-upstream-vs-v10-custom-full-diff.patch \
		--liquid-diff $(DIFFS_DIR)/01-v10-upstream-vs-v10-custom-liquid.patch \
		--js-diff $(DIFFS_DIR)/01-v10-upstream-vs-v10-custom-js.patch \
		--css-diff $(DIFFS_DIR)/01-v10-upstream-vs-v10-custom-css.patch \
		--json-changes $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json \
		--diff-set-1 $(DIFFS_DIR)/01-v10-upstream-vs-v10-custom-file-changes.txt \
		--diff-set-2 $(DIFFS_DIR)/02-v10-custom-vs-v15-upstream-file-changes.txt \
		--diff-set-3 $(DIFFS_DIR)/03-v10-upstream-vs-v15-upstream-file-changes.txt \
		--output $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json
	@echo "✓ Categorized file changes"

# Generate JSON patch files
generate-json-patches: verify-config
	@echo "Generating JSON patch files..."
	@cd $(ROOT_DIR) && $(PYTHON) scripts/generate-json-patches.py --output-dir $(JSON_PATCHES_DIR)
	@echo "✓ Generated JSON patch files"

# Generate file patch files
generate-file-patches: categorize verify-config
	@echo "Generating file patch files..."
	@test -f $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json || (echo "Error: Run 'make categorize' first!" && exit 1)
	@cd $(ROOT_DIR) && $(PYTHON) scripts/generate-file-patches.py \
		--inventory $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json \
		--output-dir $(FILE_PATCHES_DIR)
	@echo "✓ Generated file patch files"

# Extract JSON changes to separate files
extract-json-changes: analyze-json
	@echo "Extracting JSON changes to separate files..."
	@test -f $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json || (echo "Error: Run 'make analyze-json' first!" && exit 1)
	@cd $(ROOT_DIR) && $(PYTHON) scripts/extract-json-changes.py \
		--json-changes $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json \
		--output-dir $(JSON_CHANGES_DIR)
	@echo "✓ Extracted JSON changes"

# Generate documentation
generate-docs: categorize extract-json-changes
	@echo "Generating documentation..."
	@test -f $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json || (echo "Error: Run 'make categorize' first!" && exit 1)
	@test -f $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json || (echo "Error: Run 'make analyze-json' first!" && exit 1)
	@cd $(ROOT_DIR) && $(PYTHON) scripts/generate-diff-documentation.py \
		--inventory $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json \
		--json-changes $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json \
		--output $(DOC_OUTPUT) \
		--extract-json
	@echo "✓ Generated documentation"

# Run complete analysis
all: verify-config fetch extract-dawn generate-diffs analyze-json categorize generate-json-patches generate-file-patches extract-json-changes generate-docs
	@echo ""
	@echo "=========================================="
	@echo "✓ Complete analysis finished successfully!"
	@echo "=========================================="
	@echo ""
	@echo "Output files:"
	@echo "  - Documentation: $(DOC_OUTPUT)"
	@echo "  - Inventory: $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json"
	@echo "  - JSON changes: $(REPORTS_DIR)/CUSTOM_JSON_CHANGES_ALL_COMPARISONS.json"
	@echo "  - JSON patches: $(JSON_PATCHES_DIR)/"
	@echo "  - File patches: $(FILE_PATCHES_DIR)/"
	@echo ""

# Clean generated files (be careful!)
clean:
	@echo "Cleaning generated files..."
	@echo "This will remove all analysis outputs:"
	@echo "  - $(DIFFS_DIR)/"
	@echo "  - $(REPORTS_DIR)/"
	@echo "  - $(DAWN_COMPARISON_DIR)/"
	@echo "  - $(DAWN_DESTINATION_DIR)/"
	@echo "  - $(JSON_PATCHES_DIR)/"
	@echo "  - $(FILE_PATCHES_DIR)/"
	@echo "  - $(JSON_CHANGES_DIR)/"
	@echo "  - $(DOC_OUTPUT)"
	@echo ""
	@echo "Note: Configuration files (version-config.json, Makefile, READMEs) will be kept."
	@echo ""
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd $(ROOT_DIR) && \
		rm -rf $(DIFFS_DIR) $(REPORTS_DIR) $(DAWN_COMPARISON_DIR) $(DAWN_DESTINATION_DIR) \
			$(JSON_PATCHES_DIR) $(FILE_PATCHES_DIR) $(JSON_CHANGES_DIR) \
			$(DOC_OUTPUT) && \
		echo "✓ Cleaned generated files"; \
	else \
		echo "Cancelled"; \
	fi

# Create upgrade branches from Dawn destination version
create-upgrade-branches: verify-config fetch
	@echo "Creating upgrade branches..."
	@cd $(ROOT_DIR) && bash scripts/create-upgrade-branches.sh
	@echo ""
	@echo "✓ Upgrade branches created"
	@echo ""
	@echo "Next: Review .upgrade-analysis/MERGE_STRATEGY.md for next steps"

# Apply custom files to upgrade branch (requires being on upgrade work branch)
apply-custom-files: verify-config
	@echo "Applying custom files from develop branch..."
	@test -f $(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json || (echo "Error: Run 'make categorize' first!" && exit 1)
	@cd $(ROOT_DIR) && $(PYTHON) -c " \
import json, subprocess, sys; \
inv = json.load(open('$(REPORTS_DIR)/CUSTOM_CHANGES_INVENTORY.json')); \
custom_files = []; \
[custom_files.extend(files) for files in inv.get('custom_files', {}).values()]; \
paths = [f['path'] for f in custom_files]; \
print('\n'.join(paths)) \
" | while read filepath; do \
		echo "  Copying: $$filepath"; \
		git checkout develop -- "$$filepath" 2>/dev/null || echo "    (file not found in develop)"; \
	done
	@echo ""
	@echo "✓ Custom files copied"
	@echo ""
	@echo "Next: Review changes and commit"
	@echo "  git status"
	@echo "  git add ."
	@echo "  git commit -m 'feat: Copy all custom files from develop branch'"

