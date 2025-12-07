# Project-Specific Agent Guidelines

## Overview
- Purpose: Firefox extension that exposes a REST API for managing browser windows/tabs via Native Messaging
- Key files: `background.js`, `native/native_host.js`, `manifest.json`, `options.html`, `options.js`

## Rules
- Use Apache 2.0 license for all new files (add SPDX header)
- Keep native host separate from extension (cannot be bundled)
- Token authentication is optional but validated when set
- Port must be configurable (default 8090, range 1024-65535)

## API Documentation
- OpenAPI specification: `openapi.yaml` (OpenAPI 3.1.0)
- Documents all endpoints: `/windows`, `/tabs`, `/switch-tab`, `/open-url`
- Includes request/response schemas and authentication details
- Authentication is optional (Bearer token via Authorization or X-API-Token header)

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

## See Also
- [README.md](README.md) for installation and usage
- [LICENSE](LICENSE) for Apache 2.0 terms