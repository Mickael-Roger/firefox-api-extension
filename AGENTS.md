# Project-Specific Agent Guidelines

## Overview
- Purpose: Firefox extension that exposes a REST API for managing browser windows/tabs via Native Messaging
- Key files: `background.js`, `native/native_host.js`, `manifest.json`

## Rules
- Use Apache 2.0 license for all new files (add SPDX header)
- Keep native host separate from extension (cannot be bundled)
- Port is fixed at 8090 (not configurable)
- Authentication is disabled (no API token required)
- Manifest must include `data_collection_permissions` at root level with `collects_diagnostic_data: false` for AMO signing
- Manifest must also include `browser_specific_settings.gecko.data_collection_permissions` with `required: ["none"]` for Firefox built-in consent system

## Configuration
- Port is hardcoded to 8090 (not configurable)
- Authentication is disabled (no API token)
- No configuration file or storage required

## API Documentation
- OpenAPI specification: `openapi.yaml` (OpenAPI 3.1.0)
 - Documents all endpoints: `/windows`, `/tabs`, `/switch-tab`, `/open-url`, `/close-tab`
 - Includes request/response schemas and authentication details
 - Close tab endpoint returns 404 for non-existent tabs
- Authentication is disabled (no API token required)

## CI/CD Workflow (.github/workflows/build-release.yml)
- Trigger: tags starting with 'v'
- Builds both .zip and .xpi extension artifacts
- Native host packaged as tar.gz but not included in GitHub release (artifact only)
- Uses web-ext@8.2.0 (compatibility with Node.js 20)
- Release creation may require repository permissions (contents: write) - if 403 error occurs, check workflow permissions

## Lessons Learned
- GitHub Actions default GITHUB_TOKEN may lack write permissions for releases; need to adjust repository settings or add `permissions: contents: write`
- web-ext 9.2.0 has compatibility issues with Node.js 20; pin to 8.2.0
- Extension and native host must be distributed separately due to security restrictions
- Configuration should be stored in a native‑host‑managed file outside Firefox profile when profile is read‑only (e.g., system‑wide installations)
- For maximum simplicity, configuration can be removed entirely: port fixed at 8090, no authentication

## See Also
- [README.md](README.md) for installation and usage
- [LICENSE](LICENSE) for Apache 2.0 terms