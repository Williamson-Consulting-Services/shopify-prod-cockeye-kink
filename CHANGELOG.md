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

## [15.4.1] - 2025-01-27

### Added
- Upgraded base theme from Dawn 10.0.0 to Dawn 15.4.0
- All custom files preserved and integrated with Dawn 15.4.0 updates
- Custom measurements system fully functional on new base
- Custom order management features (banner, checkout footer) integrated
- All custom JavaScript modules and CSS components updated

### Changed
- Base theme upgraded from Dawn 10.0.0 to Dawn 15.4.0
- Applied custom modifications to 39 Dawn files (sections, snippets, layout, assets)
- Merged custom settings into Dawn 15.4.0 settings schema
- Merged custom translation keys into Dawn 15.4.0 locale files
- Reverted non-English locale files to clean Dawn 15.4.0 versions (English-only customizations)
- Applied Prettier formatting across repository

### Technical Details
- **Base Version**: Dawn 15.4.0
- **Custom Files**: 47 files copied (assets, snippets, templates)
- **Modified Dawn Files**: 39 files patched with custom changes
- **Locale Files**: English customizations preserved, other locales reverted
- **Configuration**: Settings schema and data merged with Dawn 15.4.0 structure

### Notes
- This is the first custom iteration (15.4.1) on the Dawn 15.4.0 base
- All custom functionality has been preserved and tested
- Ready for review and testing before merge to develop branch

---

## [10.0.3] - 2025-12-02

### Changed

- Version increment for release tracking (no code changes)

### Notes

- Base: Dawn 10.0.0
- No breaking changes
- Version bump only - no functional changes

---

## [10.0.2] - 2025-12-02

### Added

- New utility methods in `custom-order-utils.js` for checking edit-related URL parameters and waiting for configuration availability
- Enhanced edit mode detection that waits for configuration before determining edit state

### Changed

- Improved edit mode detection in custom measurements form to show editing banner based on URL parameters
- Enhanced configuration handling to ensure accurate edit mode detection by waiting for configuration availability
- Updated GitHub Actions workflow (`release-on-merge.yml`) with enhanced permissions for write access to contents and read access to pull requests
- Improved credential handling in GitHub Actions workflow checkout step for smoother release process

### Fixed

- Edit mode detection now reliably shows banner when product page loads with edit parameters
- Configuration availability is properly awaited before determining edit mode state

### Notes

- Base: Dawn 10.0.0
- No breaking changes

---

## [10.0.1] - 2025-12-01

### Added

- Custom measurements form system with modular architecture
- Custom order checkout footer component with sticky positioning
- Custom order edit functionality from cart (pencil icon button)
- Property filtering system to remove empty/zero values from orders
- Custom order utilities module (`custom-order-utils.js`) for centralized logic
- Cart edit custom order handler (`cart-edit-custom-order.js`)
- Custom order banner component for "Unsaved Draft" messaging
- Custom scripts loader snippet for theme update resilience
- Edit icon (`icon-edit.liquid`) matching Dawn's icon style
- Cart item edit button snippet (`cart-item-edit-button.liquid`)
- Filtered property display snippets for cart and cart drawer
- Custom order product title setting (configurable in theme settings)
- FormData filtering in fetch interceptor as safety net
- URL query parameter cleanup after cart additions
- Enhanced edit mode detection from URL parameters
- Multi-language support for custom order features (20+ languages)

### Changed

- Refactored custom measurements form from monolithic to modular architecture
- Custom order identification now uses product title instead of properties
- Cart property display now filters empty, zero, and internal properties
- Edit button moved from text link to icon button next to remove button
- Form submission now filters properties at both input and FormData levels
- Custom order banner shows immediately on page load when editing
- State management improved for banner and form reset after cart updates

### Fixed

- Empty properties no longer appear in Shopify admin order pages
- Zero-value properties (0.000, 0.00, etc.) filtered from orders
- Properties with "- Text" suffix filtered when empty
- Internal properties (starting with "\_") filtered from display
- Edit button styling now matches remove button (size, spacing, no shadow)
- URL query parameters cleared after adding item to cart
- Banner state resets correctly after cart additions
- Form state properly reinitializes after cart updates

### Notes

- Base: Dawn 10.0.0
- No breaking changes
- Custom orders identified by configurable product title (default: "Custom Order")
- Version increment and git tagging required on merge to main

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
