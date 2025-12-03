# Git Merge Strategy for Dawn 15.4.0 Upgrade

## Overview

This document outlines the strategy for upgrading from Dawn 10.0.0 (custom) to Dawn 15.4.0 (upstream/main) while preserving all custom changes.

## Prerequisites

✅ **Phase 1 Complete:** All analysis outputs available:
- `UPGRADE_CUSTOM_CHANGES.md` - Complete change documentation
- `.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json` - Categorized inventory
- `.upgrade-analysis/json-patches/` - JSON patch files
- `.upgrade-analysis/patches/` - File patch files
- `.upgrade-analysis/dawn-comparison/` - Dawn 10.0.0 reference files
- `.upgrade-analysis/dawn-destination/` - Dawn 15.4.0 reference files

## Strategy Options

### Option 1: Clean Base + Apply Patches (Recommended)

**Best for:** Controlled, systematic upgrade with full control

**Approach:**
1. Create clean Dawn 15.4.0 base branch
2. Systematically apply custom changes using patch files
3. Test incrementally
4. Merge to develop

**Pros:**
- Clean starting point
- Full control over each change
- Easy to review and test
- Can cherry-pick specific changes

**Cons:**
- More manual work
- Need to resolve conflicts manually

### Option 2: Merge Strategy with Conflict Resolution

**Best for:** Automated merge where most changes are compatible

**Approach:**
1. Create Dawn 15.4.0 branch from upstream/main
2. Merge develop branch
3. Resolve conflicts systematically using analysis
4. Test and fix issues

**Pros:**
- Preserves git history
- Git handles non-conflicting changes
- Shows merge commit clearly

**Cons:**
- Many conflicts to resolve
- Need good understanding of changes
- Harder to review systematically

### Option 3: Rebase Strategy

**Best for:** Linear history preferred

**Approach:**
1. Create Dawn 15.4.0 branch
2. Rebase develop onto it
3. Resolve conflicts commit by commit

**Pros:**
- Linear history
- Clean commit structure

**Cons:**
- Rewrites history
- Can be complex with many conflicts
- Loses merge context

## Recommended Approach: Option 1 (Clean Base + Apply Patches)

### Step-by-Step Process

#### Step 1: Prepare Clean Base Branch

```bash
# Ensure we have latest upstream
git fetch upstream main
git fetch upstream --tags

# Create new branch from upstream/main
git checkout -b upgrade/dawn-15.4.0-base upstream/main

# Verify we're on correct version
git show HEAD:config/settings_schema.json | grep theme_version
# Should show: "theme_version": "15.4.0"

# Push base branch
git push -u origin upgrade/dawn-15.4.0-base
```

#### Step 2: Create Upgrade Working Branch

```bash
# Create working branch from base
git checkout -b upgrade/dawn-15.4.0-work

# This branch will have all custom changes applied
```

#### Step 3: Apply Custom Files (COPY Action)

**From Inventory:** `CUSTOM_CHANGES_INVENTORY.json` → `custom_files`

```bash
# Get list of custom files from inventory
python3 -c "
import json
with open('.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json') as f:
    inv = json.load(f)
    for category, files in inv.get('custom_files', {}).items():
        for file_info in files:
            print(file_info['path'])
" | while read filepath; do
    echo "Copying custom file: $filepath"
    git checkout develop -- "$filepath"
    git add "$filepath"
done

# Commit custom files
git commit -m "feat: Copy all custom files from develop branch

- Assets: custom JavaScript and CSS files
- Snippets: custom measurement and order components
- Templates: custom product templates
- Scripts and documentation"
```

#### Step 4: Restore Deleted Dawn Files (RESTORE Action)

**From Inventory:** `CUSTOM_CHANGES_INVENTORY.json` → `removed_dawn_files`

```bash
# Get list of files to restore
python3 -c "
import json
with open('.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json') as f:
    inv = json.load(f)
    for file_info in inv.get('removed_dawn_files', []):
        print(file_info['path'])
" | while read filepath; do
    echo "Restoring Dawn file: $filepath"
    git checkout upstream/main -- "$filepath" 2>/dev/null || echo "  (file may not exist in 15.4.0)"
done

# Commit restored files
git commit -m "restore: Restore Dawn files that were deleted

Restoring files that existed in Dawn 10.0.0 but were removed.
These files are now restored from Dawn 15.4.0."
```

#### Step 5: Revert Non-English Locale Changes (REVERT Action)

**From Inventory:** Files marked for REVERT

```bash
# Revert non-English locale files to Dawn 15.4.0 versions
for locale_file in locales/*.json; do
    # Skip English (we keep custom changes)
    if [[ "$locale_file" == *"en.default"* ]]; then
        continue
    fi
    echo "Reverting locale: $locale_file"
    git checkout upstream/main -- "$locale_file"
done

# Same for schema files
for locale_schema in locales/*.schema.json; do
    if [[ "$locale_schema" == *"en.default"* ]]; then
        continue
    fi
    echo "Reverting locale schema: $locale_schema"
    git checkout upstream/main -- "$locale_schema"
done

git commit -m "revert: Revert non-English locales to Dawn 15.4.0

Only English locale has custom changes. All other locales
reverted to clean Dawn 15.4.0 versions."
```

#### Step 6: Apply Modified Dawn Files (PATCH_MODIFIED Action)

**From Inventory:** Files marked for PATCH_MODIFIED

**Process:**
1. Start with Dawn 15.4.0 version
2. Apply custom changes from patch files
3. Resolve any conflicts

```bash
# For each file marked for PATCH_MODIFIED
python3 -c "
import json
with open('.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json') as f:
    inv = json.load(f)
    for filepath in inv.get('files_to_patch_modified', []):
        print(filepath)
" | while read filepath; do
    echo "Processing: $filepath"

    # Get Dawn 15.4.0 version
    git checkout upstream/main -- "$filepath"

    # Apply patch if it exists
    patch_file=$(echo "$filepath" | sed 's/\//-/g')
    if [ -f ".upgrade-analysis/patches/${patch_file}.patch" ]; then
        echo "  Applying patch: ${patch_file}.patch"
        # Manual review needed - apply patch carefully
        # git apply --check ".upgrade-analysis/patches/${patch_file}.patch"
        # git apply ".upgrade-analysis/patches/${patch_file}.patch"
    fi

    git add "$filepath"
done

# Commit in batches by directory
git commit -m "feat: Apply custom changes to Dawn 15.4.0 files

Applied custom modifications to:
- layout/theme.liquid (custom renders)
- sections/*.liquid (custom integrations)
- snippets/*.liquid (custom modifications)"
```

**Note:** Patch files show what to add. Manual review recommended for each file.

#### Step 7: Migrate JSON Configuration Files

**Most Critical Step** - Use patch files as reference

**Settings Schema (`config/settings_schema.json`):**

1. Start with Dawn 15.4.0 version
2. Review patch files:
   - `.upgrade-analysis/json-patches/config-settings_schema.json-custom.patch` - Our customizations
   - `.upgrade-analysis/json-patches/config-settings_schema.json-dawn-updates.patch` - Dawn's updates

3. Apply custom settings sections while preserving Dawn updates

```bash
# Get Dawn 15.4.0 settings_schema.json
git checkout upstream/main -- config/settings_schema.json

# Manual edit needed - use patch files as reference
# - Add custom measurement settings
# - Add custom order settings
# - Preserve Dawn 15.4.0 updates
```

**Settings Data (`config/settings_data.json`):**

```bash
# Get Dawn 15.4.0 settings_data.json
git checkout upstream/main -- config/settings_data.json

# Merge custom setting values
# Use patches as reference:
# - .upgrade-analysis/json-patches/config-settings_data.json-custom.patch
# - .upgrade-analysis/json-patches/config-settings_data.json-dawn-updates.patch
```

**English Locale (`locales/en.default.json` and `en.default.schema.json`):**

```bash
# Get Dawn 15.4.0 English locale
git checkout upstream/main -- locales/en.default.json
git checkout upstream/main -- locales/en.default.schema.json

# Merge custom translation keys
# Use patches as reference:
# - .upgrade-analysis/json-patches/locales-en.default.json-custom.patch
# - .upgrade-analysis/json-patches/locales-en.default.schema.json-custom.patch
```

#### Step 8: Update Theme Version

```bash
# Update theme_version in settings_schema.json
# Change from "15.4.0" to "15.4.1" (first custom iteration on new base)
# Or update custom build number if using that approach

git commit -m "chore: Update theme version to 15.4.1

First custom iteration on Dawn 15.4.0 base."
```

#### Step 9: Test and Validate

```bash
# Test key functionality
# 1. Custom measurements form
# 2. Custom order banner
# 3. Checkout footer
# 4. Cart functionality
# 5. Product templates
# 6. All custom integrations

# Fix any issues found
git commit -m "fix: Resolve issues from Dawn 15.4.0 upgrade"
```

#### Step 10: Merge to Develop

```bash
# Switch to develop
git checkout develop

# Merge upgrade branch
git merge --no-ff upgrade/dawn-15.4.0-work -m "feat: Upgrade to Dawn 15.4.0

Major upgrade from Dawn 10.0.0 to 15.4.0 while preserving all custom changes.

Changes:
- All custom files preserved
- Custom modifications applied to Dawn files
- JSON configuration migrated
- Non-English locales reverted to clean versions

See UPGRADE_CUSTOM_CHANGES.md for complete change list."
```

## Alternative: Automated Script Approach

Create a script to automate the systematic application:

```bash
# scripts/apply-upgrade.sh
#!/bin/bash

# Apply all custom files
# Apply all patches
# Migrate JSON files
# Update version

# This can be created based on the steps above
```

## Conflict Resolution Guide

When applying patches, conflicts may occur. Use this priority:

1. **Dawn 15.4.0 updates take priority** for Dawn core functionality
2. **Custom changes take priority** for custom features
3. **Merge both** when changes are in different areas
4. **Review carefully** when changes overlap

Use patch files to understand:
- What Dawn changed between 10.0.0 and 15.4.0
- What we custom changed from 10.0.0
- Where they might conflict

## Testing Checklist

- [ ] Custom measurements form works
- [ ] Custom order banner displays
- [ ] Checkout footer appears and updates
- [ ] Cart functionality works
- [ ] All custom product templates load
- [ ] Custom JavaScript modules load
- [ ] Custom CSS applies correctly
- [ ] Settings schema loads in theme editor
- [ ] All custom settings accessible
- [ ] English locale translations work
- [ ] No JavaScript console errors
- [ ] All integrations work correctly

## Rollback Plan

If issues found after merge:

```bash
# Create backup branch first
git checkout develop
git branch backup/pre-15.4.0-merge

# If rollback needed
git reset --hard backup/pre-15.4.0-merge
# OR
git revert <merge-commit-sha>
```

## Post-Merge Tasks

1. Update version tracking documentation
2. Update CHANGELOG.md
3. Test thoroughly in staging
4. Create release tag after testing
5. Deploy to production

## Notes

- **Take your time** - This is a major upgrade
- **Test incrementally** - Don't wait until the end
- **Commit often** - Small, logical commits
- **Use patch files** - They show exactly what changed
- **Review carefully** - Especially JSON files and integrations
- **Ask for help** - Complex merges benefit from review

