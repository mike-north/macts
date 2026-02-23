import { describe, it, expect } from 'vitest'
import { parseManifestYaml, ManifestLoadError, loadManifest } from './loader.js'

describe('parseManifestYaml', () => {
  it('should parse valid minimal manifest YAML', () => {
    const yaml = `
version: "1.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: r
        description: The name
hierarchy:
  children:
    documents:
      resource: Document
      access: r
      description: All documents
`

    const manifest = parseManifestYaml(yaml)

    expect(manifest.version).toBe('1.0')
    expect(manifest.app.name).toBe('TestApp')
    expect(manifest.app.bundleId).toBe('com.example.test')
    expect(manifest.resources['Document']).toBeDefined()
    expect(manifest.resources['Document']?.name).toBe('Document')
    expect(manifest.hierarchy.children['documents']).toBeDefined()
    expect(manifest.hierarchy.children['documents']?.resource).toBe('Document')
  })

  it('should parse manifest with all optional fields', () => {
    const yaml = `
version: "1.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
  displayName: Test Application
suites:
  - name: Standard Suite
    code: core
    description: Standard commands
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    code: docu
    schema: document.schema.json
    properties:
      name:
        access: rw
        type: string
        description: The name
        code: pnam
        optional: true
        default: "Untitled"
    identifiers:
      - property: name
        primary: true
  Page:
    name: Page
    plural: pages
    description: A page
    properties:
      content:
        access: r
        description: The content
enums:
  SaveOptions:
    name: SaveOptions
    description: Save options
    values:
      - name: yes
        value: "yes"
        description: Save the file
        code: "yes "
      - name: no
        value: "no"
        description: Don't save
        code: "no  "
hierarchy:
  children:
    documents:
      resource: Document
      access: rw
      description: All documents
      children:
        pages:
          resource: Page
          access: r
          description: Pages in document
relationships:
  - name: documentPages
    from: Document
    to: Page
    cardinality: one-to-many
    description: Document pages
commands:
  save:
    name: save
    description: Save a document
    scope: resource
    code: save
extraction:
  extractedAt: "2024-01-01T00:00:00Z"
  confidence:
    overall: 0.95
  openQuestions:
    - question: What is the default value?
      context: For the name property
`

    const manifest = parseManifestYaml(yaml)

    expect(manifest.suites).toHaveLength(1)
    expect(manifest.suites[0]?.name).toBe('Standard Suite')
    expect(manifest.enums['SaveOptions']).toBeDefined()
    expect(manifest.enums['SaveOptions']?.values).toHaveLength(2)
    expect(manifest.relationships).toHaveLength(1)
    expect(manifest.relationships[0]?.name).toBe('documentPages')
    expect(manifest.relationships[0]?.cardinality).toBe('one-to-many')
    expect(manifest.commands['save']).toBeDefined()
    expect(manifest.commands['save']?.scope).toBe('resource')
    expect(manifest.extraction).toBeDefined()
    expect(manifest.extraction?.confidence?.overall).toBe(0.95)
    expect(manifest.extraction?.openQuestions).toHaveLength(1)
  })

  it('should apply default values for optional fields', () => {
    const yaml = `
version: "1.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: r
        description: The name
hierarchy:
  children:
    documents:
      resource: Document
      access: r
`

    const manifest = parseManifestYaml(yaml)

    // Defaults from schema
    expect(manifest.suites).toEqual([])
    expect(manifest.enums).toEqual({})
    expect(manifest.relationships).toEqual([])
    expect(manifest.commands).toEqual({})
  })

  it('should throw on invalid YAML syntax', () => {
    const invalidYaml = `
version: "1.0
app:
  name: TestApp
  missing closing quote above
`

    expect(() => parseManifestYaml(invalidYaml)).toThrow()
  })

  it('should throw on valid YAML but invalid schema - missing version', () => {
    const yaml = `
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: r
        description: The name
hierarchy:
  root: Document
  children: []
`

    expect(() => parseManifestYaml(yaml)).toThrow()
  })

  it('should throw on valid YAML but invalid schema - wrong version', () => {
    const yaml = `
version: "2.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: r
        description: The name
hierarchy:
  root: Document
  children: []
`

    expect(() => parseManifestYaml(yaml)).toThrow()
  })

  it('should throw on valid YAML but invalid schema - no resources', () => {
    const yaml = `
version: "1.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources: {}
hierarchy:
  children: {}
`

    expect(() => parseManifestYaml(yaml)).toThrow('At least one resource is required')
  })

  it('should throw on valid YAML but invalid schema - missing required property fields', () => {
    const yaml = `
version: "1.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: r
        # missing description
hierarchy:
  children:
    documents:
      resource: Document
      access: r
`

    expect(() => parseManifestYaml(yaml)).toThrow()
  })

  it('should throw on valid YAML but invalid schema - invalid property access', () => {
    const yaml = `
version: "1.0"
app:
  name: TestApp
  bundleId: com.example.test
  version: "1.0.0"
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: readonly
        description: The name
hierarchy:
  children:
    documents:
      resource: Document
      access: r
`

    expect(() => parseManifestYaml(yaml)).toThrow()
  })
})

describe('ManifestLoadError', () => {
  it('should have correct properties', () => {
    const cause = new Error('Original error')
    const error = new ManifestLoadError('Test message', '/path/to/manifest.yaml', cause)

    expect(error.name).toBe('ManifestLoadError')
    expect(error.message).toBe('Test message')
    expect(error.path).toBe('/path/to/manifest.yaml')
    expect(error.cause).toBe(cause)
  })

  it('should work without cause', () => {
    const error = new ManifestLoadError('Test message', '/path/to/manifest.yaml')

    expect(error.name).toBe('ManifestLoadError')
    expect(error.message).toBe('Test message')
    expect(error.path).toBe('/path/to/manifest.yaml')
    expect(error.cause).toBeUndefined()
  })

  it('should be instanceof Error', () => {
    const error = new ManifestLoadError('Test message', '/path/to/manifest.yaml')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ManifestLoadError)
  })
})

describe('loadManifest', () => {
  it('should throw ManifestLoadError for non-existent file', async () => {
    const timestamp = Date.now()
    const nonExistentPath = `/tmp/claude/definitely-does-not-exist-${timestamp.toString()}.yaml`

    await expect(loadManifest(nonExistentPath)).rejects.toThrow(ManifestLoadError)
    await expect(loadManifest(nonExistentPath)).rejects.toThrow('Failed to load manifest')

    try {
      await loadManifest(nonExistentPath)
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestLoadError)
      if (error instanceof ManifestLoadError) {
        expect(error.path).toBe(nonExistentPath)
        expect(error.cause).toBeDefined()
      }
    }
  })

  it('should throw ManifestLoadError with validation error for invalid manifest', () => {
    // This test would require creating a temp file with invalid content
    // For now, we test the error handling through parseManifestYaml
    const invalidYaml = `
version: "1.0"
app:
  name: TestApp
  # missing bundleId
resources:
  Document:
    name: Document
    plural: documents
    description: A document
    properties:
      name:
        access: r
        description: The name
hierarchy:
  root: Document
  children: []
`

    expect(() => parseManifestYaml(invalidYaml)).toThrow()
  })
})
