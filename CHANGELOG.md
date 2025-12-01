# Changelog

All notable changes to this theme will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Tracking

- **Format:** `MAJOR.MINOR.PATCH`
- **MAJOR.MINOR** = Dawn base theme version
- **PATCH** = Custom iteration counter (increments on main branch merges only)

## Release Process

All releases must:
1. Update version in `config/settings_schema.json`
2. Update `CHANGELOG.md` with release notes
3. Merge from `develop` to `main` branch
4. **Create git tag** with version (e.g., `v10.0.1`)
5. Push main branch and tags to remote

See [Version Tracking Workflow](../.cursor/version-tracking-workflow.mdc) for detailed release process.

## [Unreleased]

### Added
- (Items will be listed here)

### Changed
- (Items will be listed here)

### Fixed
- (Items will be listed here)

## [10.0.1] - YYYY-MM-DD

### Added
- Initial custom features
- Custom measurements form system
- Custom order checkout footer

### Changed
- Base theme: Dawn 10.0.0

---

## Release Notes Format

When creating release notes, follow this structure:

### [Version] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing functionality

#### Deprecated
- Features that will be removed

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security fixes

### Version Reference

- Reference Dawn base version in major.minor format
- Note any Dawn upgrades or base changes
- Document breaking changes clearly

## Example Entry

```markdown
## [10.0.5] - 2024-01-15

### Added
- Custom measurements validation service
- Unit conversion toggle (inches/cm)

### Changed
- Refactored custom measurements form from monolithic to modular architecture

### Fixed
- Resolved checkout footer visibility on mobile devices
- Fixed cart count accuracy for custom items

### Notes
- Base: Dawn 10.0.0
- No breaking changes
```

