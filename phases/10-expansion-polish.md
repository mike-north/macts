# Phase 10: Expansion & Polish

## Goal

Expand beyond Calendar to additional apps, polish the developer experience, and prepare for public release.

## Key Deliverables

### 1. Additional App Manifests

**Priority 1: System Apps (every Mac)**

- Finder
- Safari
- Mail
- Notes
- Reminders
- Music (iTunes successor)
- Photos

**Priority 2: Popular Third-Party Apps**

- OmniFocus
- Things 3
- Fantastical
- Spotify
- Alfred
- 1Password (if scriptable)

**Priority 3: Pro Apps**

- Logic Pro
- Final Cut Pro
- Keynote/Pages/Numbers

### 2. Developer Experience Polish

- **Error Messages**: Clear, actionable error messages everywhere
- **Documentation**: API reference docs generated from TSDoc
- **Examples**: Usage examples for each SDK
- **Changelog**: Proper changesets for all packages
- **Migration Guides**: For breaking changes between versions

### 3. Testing Infrastructure

- **attest-it Integration**: Full setup for distributed testing
- **CI Enforcement**: Attestation seals checked in CI
- **Seal Invalidation**: Automatic invalidation when files change
- **Coverage Reports**: Test coverage tracking

### 4. Release Automation

- **Changeset Publishing**: Automated npm publishing
- **GitHub Releases**: Automated release notes
- **Documentation Site**: Published API docs

### 5. Performance Optimization

- **JXA Batching**: Batch multiple operations when possible
- **Caching**: Cache app connections, minimize osascript spawns
- **Lazy Loading**: Lazy plugin loading for CLI startup time

### 6. Edge Case Handling

- **App Not Running**: Graceful errors when target app isn't open
- **TCC Permissions**: Clear guidance on granting permissions
- **Sandboxed Apps**: Handle App Store sandboxing limitations
- **Multiple Windows**: Handle multi-window apps correctly

## Timeline Considerations

This phase is ongoing and parallelizable:

- Different contributors can work on different apps
- Polish work can happen alongside new app manifests
- Each app goes through: extract → generate → test → document → publish

## Success Criteria

- [ ] At least 3 system apps have published SDKs
- [ ] At least 1 third-party app has published SDK
- [ ] API documentation site is live
- [ ] All packages have meaningful READMEs
- [ ] attest-it workflow documented for contributors
- [ ] Error messages reviewed and improved
- [ ] Performance acceptable (< 500ms for simple operations)
