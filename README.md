# skyux-icons

## Overview

SKY UX icons is a package that provides icon assets for the SKY UX framework.

## Usage

To use SKY UX icons, use the [SKY UX icon component](https://developer.blackbaud.com/skyux/components/icon).

## Adding new icons

### Adding Fluent icons

1. Add the icon name to the alphabetized list in `src/svg/fluent-icon-list.txt`
   - Do not include any variant or size information
   - Verify the icon name in the [Fluent icon GitHub repo](https://github.com/microsoft/fluentui-system-icons/tree/main/assets)
2. Release the `skyux-icons` repo following the release process below

### Adding custom icons

1. Add SVG files to `src/svg` using file name format: `<name>-<size>-<variant>.svg`
2. All sizes require both a solid and line variant
3. SVG files must not contain:
   - Classes
   - `<style>` elements
   - Inline styles

### Adding branded icons

Branded icons support maintaining brand color customization. Follow the steps for custom icons, but put SVGs in `src/svg/branded`.

## Release Process

### Minor Version

- Release `skyux-icons` only

### Major Version

1. Release `skyux-icons`
2. Update `@skyux/icon` component:
   - `@skyux/icons` package version
   - the major version in the CDN URL in `SkyIconSvgResolverService`

## Maintenance

**Important:** All updates to the `@fluentui/svg-icons` package require a breaking change release due to potential visual changes in any version (major, minor, or patch).

To create a breaking change, add `!` to your commit title, i.e. `feat!: update fluent icon version`

## Legal

Icons that have an `owner` property in the `metadata.json` file are the property of the listed organization.

Icons owned by `Webalys, LLC` must only be used within the context of the SKY UX user experience framework.
