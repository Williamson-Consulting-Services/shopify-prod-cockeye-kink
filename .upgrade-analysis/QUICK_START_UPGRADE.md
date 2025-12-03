# Quick Start: Upgrading to Dawn 15.4.0

## Overview

This guide provides a quick path to upgrade from Dawn 10.0.0 (current develop) to Dawn 15.4.0 (upstream/main).

## Prerequisites

✅ **Phase 1 Analysis Complete:**
```bash
# Verify all analysis files exist
ls -la .upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json
ls -la UPGRADE_CUSTOM_CHANGES.md
```

## Recommended Strategy: Clean Base + Apply Patches

This approach gives you full control and is easiest to review/test.

### Step 1: Create Upgrade Branches

```bash
# Creates two branches:
# - upgrade/dawn-15.4.0-base (clean Dawn 15.4.0)
# - upgrade/dawn-15.4.0-work (where we'll apply changes)
make -C .upgrade-analysis create-upgrade-branches
```

This automatically:
- Fetches latest from upstream
- Creates base branch from upstream/main
- Creates working branch from base
- Verifies theme version

### Step 2: Apply Custom Files

```bash
# Switch to work branch (if not already there)
git checkout upgrade/dawn-15.4.0-work

# Copy all custom files from develop
make -C .upgrade-analysis apply-custom-files

# Review and commit
git status
git add .
git commit -m "feat: Copy all custom files from develop branch"
```

### Step 3: Apply Custom Changes to Dawn Files

**Use the inventory and patch files to systematically apply changes:**

1. **Review what needs to be done:**
   - Read `UPGRADE_CUSTOM_CHANGES.md`
   - Check `.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json`

2. **For each modified Dawn file:**
   - Start with Dawn 15.4.0 version: `git checkout upstream/main -- <file>`
   - Review patch file: `.upgrade-analysis/patches/<file>.patch`
   - Apply custom changes manually
   - Test and commit

3. **Migrate JSON files:**
   - Use patch files in `.upgrade-analysis/json-patches/` as reference
   - Start with Dawn 15.4.0 versions
   - Merge custom changes carefully
   - Pay attention to key name changes in `-dawn-updates.patch` files

### Step 4: Test Thoroughly

Test all custom functionality:
- Custom measurements form
- Custom order banner
- Checkout footer
- Cart functionality
- All integrations

### Step 5: Merge to Develop

```bash
# Switch to develop
git checkout develop

# Merge upgrade branch
git merge --no-ff upgrade/dawn-15.4.0-work -m "feat: Upgrade to Dawn 15.4.0

Major upgrade while preserving all custom changes.
See UPGRADE_CUSTOM_CHANGES.md for details."

# Push to remote
git push origin develop
```

## Key Files Reference

### Inventory File
`.upgrade-analysis/reports/CUSTOM_CHANGES_INVENTORY.json`

Shows:
- **custom_files**: Files to COPY (48 files)
- **files_to_patch_modified**: Files to MODIFY (39 files)
- **files_to_revert_to_clean**: Files to REVERT (51 files - non-English locales)
- **removed_dawn_files**: Files to RESTORE or ACCEPT (15 files)

### Patch Files

**JSON patches:** `.upgrade-analysis/json-patches/`
- `*-custom.patch` - Our customizations
- `*-dawn-updates.patch` - Dawn's updates between versions

**File patches:** `.upgrade-analysis/patches/`
- Show custom changes to apply to Dawn 15.4.0 files

### Documentation

**Complete documentation:** `UPGRADE_CUSTOM_CHANGES.md`
- Full inventory of all changes
- Detailed file listings
- Patch file references

**Strategy guide:** `.upgrade-analysis/MERGE_STRATEGY.md`
- Detailed step-by-step process
- Alternative strategies
- Conflict resolution guide

## Workflow Summary

```
1. make -C .upgrade-analysis create-upgrade-branches
   ↓
2. git checkout upgrade/dawn-15.4.0-work
   ↓
3. make -C .upgrade-analysis apply-custom-files
   ↓
4. Apply custom changes systematically (using patch files)
   ↓
5. Test everything
   ↓
6. git checkout develop
   ↓
7. git merge --no-ff upgrade/dawn-15.4.0-work
   ↓
8. Done!
```

## Tips

- **Commit often** - Small, logical commits make review easier
- **Test incrementally** - Don't wait until the end
- **Use patch files** - They show exactly what changed
- **Review carefully** - Especially JSON files
- **Take your time** - This is a major upgrade

## Getting Help

If stuck:
1. Review `MERGE_STRATEGY.md` for detailed steps
2. Check patch files for specific changes
3. Review inventory JSON for file categories
4. Consult `UPGRADE_CUSTOM_CHANGES.md` for complete documentation

## Rollback

If you need to rollback:

```bash
# Before merging, create backup
git checkout develop
git branch backup/pre-15.4.0-merge

# If rollback needed after merge
git reset --hard backup/pre-15.4.0-merge
# OR
git revert <merge-commit-sha>
```

