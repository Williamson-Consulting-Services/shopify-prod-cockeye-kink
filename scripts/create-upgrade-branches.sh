#!/bin/bash
# Helper script to create upgrade branches from Dawn 15.4.0
# Usage: ./scripts/create-upgrade-branches.sh

set -e

# Load version config
CONFIG_FILE=".upgrade-analysis/version-config.json"
DEST_REF=$(python3 -c "import json; config = json.load(open('$CONFIG_FILE')); print(config['git_config']['destination_ref'])")

echo "Creating upgrade branches from: $DEST_REF"
echo ""

# Ensure we have latest upstream
echo "Fetching latest from upstream..."
git fetch upstream main
git fetch upstream --tags

# Verify destination ref exists
if ! git rev-parse --verify "$DEST_REF" > /dev/null 2>&1; then
    echo "Error: Destination ref '$DEST_REF' not found!"
    exit 1
fi

# Get version number for branch naming
VERSION=$(python3 -c "import json; config = json.load(open('$CONFIG_FILE')); print(config['destination_version']['dawn_base'])")

# Create base branch from upstream/main
BASE_BRANCH="upgrade/dawn-${VERSION}-base"
echo "Creating base branch: $BASE_BRANCH"
if git rev-parse --verify "$BASE_BRANCH" > /dev/null 2>&1; then
    echo "  Branch already exists. Checking it out..."
    git checkout "$BASE_BRANCH"
    git reset --hard "$DEST_REF"
else
    git checkout -b "$BASE_BRANCH" "$DEST_REF"
fi

# Verify theme version
THEME_VERSION=$(git show HEAD:config/settings_schema.json | grep -A 1 '"theme_version"' | grep -o '"[^"]*"' | head -1 | tr -d '"')
echo "  Theme version: $THEME_VERSION"
echo "  ✓ Base branch created"
echo ""

# Create working branch
WORK_BRANCH="upgrade/dawn-${VERSION}-work"
echo "Creating working branch: $WORK_BRANCH"
if git rev-parse --verify "$WORK_BRANCH" > /dev/null 2>&1; then
    echo "  Branch already exists. Use existing or delete first."
    read -p "  Delete and recreate? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -D "$WORK_BRANCH"
        git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"
    else
        echo "  Using existing branch"
        git checkout "$WORK_BRANCH"
    fi
else
    git checkout -b "$WORK_BRANCH" "$BASE_BRANCH"
fi

echo "  ✓ Working branch created"
echo ""

echo "=========================================="
echo "Upgrade branches ready!"
echo "=========================================="
echo ""
echo "Base branch: $BASE_BRANCH"
echo "Working branch: $WORK_BRANCH"
echo ""
echo "Next steps:"
echo "  1. Review .upgrade-analysis/MERGE_STRATEGY.md"
echo "  2. Apply custom files: make -C .upgrade-analysis apply-custom-files"
echo "  3. Continue with merge strategy steps"
echo ""

