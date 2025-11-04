# Publishing Guide

This guide covers publishing Agent 8 to the Open VSX Registry and/or the Visual Studio Code Marketplace, and distributing the VSIX directly.

## 1) Prerequisites
- Ensure your extension builds and packages correctly: `npx vsce package`
- Confirm `.vscodeignore` excludes dev artifacts and local servers (done).
- Repository metadata added in `package.json` (done).
- Licensing: this project uses a proprietary license. Public registries may have policies or warnings for non-open-source licenses. Direct VSIX distribution is fully supported.

## 2) Distribute the VSIX directly
- Build the VSIX: `npx vsce package`
- Share the generated file (e.g., `agent-8-0.0.2.vsix`).
- Users install via:
  - CLI: `code --install-extension path\to\agent-8-0.0.2.vsix`
  - VS Code UI: Extensions panel → More Actions (…) → Install from VSIX…

## 3) Publish to Open VSX
Open VSX provides a registry for VS Code-compatible extensions.

Steps:
1. Create an account at https://open-vsx.org and set up a personal access token (PAT).
2. Install the CLI: `npm i -D ovsx` (command is `npx ovsx`).
3. Log in: `npx ovsx login -p <YOUR_OPENVSX_PAT>`
4. Publish the VSIX: `npx ovsx publish agent-8-0.0.2.vsix`

Notes:
- If publishing under an organization namespace, ensure you have permissions.
- Open VSX may display notices for proprietary licenses.
- Update version in `package.json` and rebuild before republishing.

## 4) Publish to VS Code Marketplace (Microsoft)
The Marketplace uses `vsce publish` and requires an Azure DevOps PAT.

Steps:
1. Create a publisher at https://aka.ms/vscodepublishers
2. Create an Azure DevOps PAT (scope: Packaging) from https://dev.azure.com
3. Log in locally: `npx vsce login <publisher-name>` then provide the PAT.
4. Publish: `npx vsce publish` (uses the version in `package.json`).

Notes:
- Ensure `publisher` field in `package.json` matches your registered publisher.
- Microsoft Marketplace has policies on extension licenses and capabilities.
- If you prefer not to publish publicly, distribute the VSIX file directly.

## 5) Versioning workflow
- Update `version` in `package.json`.
- Run `npm run compile` or let `vsce` handle it.
- Run `npx vsce package` to generate a new VSIX.
- Commit and tag (optional), then publish to selected registries using the commands above.

## 6) Troubleshooting
- Missing repository field: add `repository`, `homepage`, `bugs` in `package.json`.
- README issues: ensure `README.md` is non-empty and describes features and usage.
- CLI errors:
  - `ovsx`: Use `npx ovsx publish <file.vsix>`; there is no `ovsx package` command.
  - `vsce`: If it fails, check your `engines.vscode` and metadata fields.