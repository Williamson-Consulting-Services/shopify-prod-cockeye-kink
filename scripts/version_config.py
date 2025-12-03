#!/usr/bin/env python3
"""
Version configuration loader for Dawn upgrade analysis.

Centralized configuration so version changes only need to be made in one place.
"""

import json
from pathlib import Path
from typing import Dict, Any


DEFAULT_CONFIG_PATH = Path(__file__).parent.parent / '.upgrade-analysis' / 'version-config.json'


def load_version_config(config_path: Path = None) -> Dict[str, Any]:
    """Load version configuration from JSON file."""
    if config_path is None:
        config_path = DEFAULT_CONFIG_PATH

    if not config_path.exists():
        raise FileNotFoundError(
            f"Version config file not found: {config_path}\n"
            f"Please create {config_path} with version configuration."
        )

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    return config


def get_git_refs(config_path: Path = None) -> Dict[str, str]:
    """Get git references from config."""
    config = load_version_config(config_path)
    git_config = config.get('git_config', {})

    return {
        'current': git_config.get('current_branch', 'HEAD'),
        'comparison': git_config.get('comparison_ref', 'v10.0.0'),
        'destination': git_config.get('destination_ref', 'upstream/main'),
        'upstream_remote': git_config.get('upstream_remote', 'upstream'),
    }


def get_version_info(config_path: Path = None) -> Dict[str, Dict[str, Any]]:
    """Get version information from config."""
    config = load_version_config(config_path)

    return {
        'current': config.get('current_version', {}),
        'comparison': config.get('comparison_version', {}),
        'destination': config.get('destination_version', {}),
    }


def get_version_value(key: str, config_path: Path = None) -> str:
    """
    Get a specific version value from config for use in Makefiles.

    Keys:
    - comparison.dawn_base - Dawn base version for comparison
    - destination.dawn_base - Dawn base version for destination
    - comparison.git_ref - Git ref for comparison
    - destination.git_ref - Git ref for destination
    - current.full_version - Current full version
    """
    config = load_version_config(config_path)

    parts = key.split('.')
    if len(parts) == 2:
        section, field = parts
        if section in ['comparison', 'destination', 'current']:
            version_info = get_version_info(config_path)
            if section in version_info and field in version_info[section]:
                return str(version_info[section][field])

    raise ValueError(f"Unknown key: {key}")


if __name__ == '__main__':
    import sys

    # If called with a key argument, return just that value (for Makefile use)
    if len(sys.argv) > 1:
        try:
            key = sys.argv[1]
            value = get_version_value(key)
            print(value)
            sys.exit(0)
        except (ValueError, FileNotFoundError) as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    # Otherwise, show full config (for verification)
    try:
        config = load_version_config()
        print("Version Configuration:")
        print(json.dumps(config, indent=2))

        print("\nGit References:")
        refs = get_git_refs()
        for key, value in refs.items():
            print(f"  {key}: {value}")
    except FileNotFoundError as e:
        print(f"Error: {e}")

