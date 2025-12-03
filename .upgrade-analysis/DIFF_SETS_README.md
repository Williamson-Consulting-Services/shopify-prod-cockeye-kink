# Diff Sets Documentation

This directory contains three sets of diffs for the Dawn 15.4 upgrade analysis.

## Diff Set 1: Our Customizations
**Purpose:** Identify all custom changes made to Dawn 10.0.0

**Comparison:** `v10.0.0` (Dawn 10.0.0 upstream) vs `HEAD` (our custom develop branch)

**Files:**
- `01-v10-upstream-vs-v10-custom-file-changes.txt` - File change summary
- `01-v10-upstream-vs-v10-custom-full-diff.patch` - Complete diff
- `01-v10-upstream-vs-v10-custom-liquid.patch` - Liquid template diffs
- `01-v10-upstream-vs-v10-custom-js.patch` - JavaScript diffs
- `01-v10-upstream-vs-v10-custom-css.patch` - CSS diffs
- `01-v10-upstream-vs-v10-custom-json.patch` - JSON diffs

**What this shows:** All customizations we've made to the Dawn 10.0.0 base.

---

## Diff Set 2: Potential Conflicts
**Purpose:** Identify differences between our custom version and Dawn 15.4.0

**Comparison:** `HEAD` (our custom develop branch) vs `v15.4.0` (Dawn 15.4.0 upstream)

**Files:**
- `02-v10-custom-vs-v15-upstream-file-changes.txt` - File change summary
- `02-v10-custom-vs-v15-upstream-full-diff.patch` - Complete diff
- `02-v10-custom-vs-v15-upstream-liquid.patch` - Liquid template diffs
- `02-v10-custom-vs-v15-upstream-js.patch` - JavaScript diffs
- `02-v10-custom-vs-v15-upstream-css.patch` - CSS diffs
- `02-v10-custom-vs-v15-upstream-json.patch` - JSON diffs

**What this shows:** Potential conflicts and differences we'll encounter when merging Dawn 15.4.0.

---

## Diff Set 3: Dawn Version Changes
**Purpose:** Identify all changes Dawn made between 10.0.0 and 15.4.0

**Comparison:** `v10.0.0` (Dawn 10.0.0 upstream) vs `v15.4.0` (Dawn 15.4.0 upstream)

**Files:**
- `03-v10-upstream-vs-v15-upstream-file-changes.txt` - File change summary
- `03-v10-upstream-vs-v15-upstream-full-diff.patch` - Complete diff
- `03-v10-upstream-vs-v15-upstream-liquid.patch` - Liquid template diffs
- `03-v10-upstream-vs-v15-upstream-js.patch` - JavaScript diffs
- `03-v10-upstream-vs-v15-upstream-css.patch` - CSS diffs
- `03-v10-upstream-vs-v15-upstream-json.patch` - JSON diffs

**What this shows:** All new features, updates, and changes Dawn introduced between versions.

---

## Usage in Phase 2

1. **Use Diff Set 1** to identify what customizations to apply
2. **Use Diff Set 3** to understand what Dawn changed
3. **Use Diff Set 2** to identify potential conflict areas
4. **Combine insights** to systematically apply customizations to Dawn 15.4.0

