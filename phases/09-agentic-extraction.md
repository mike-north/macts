# Phase 9: Agentic Extraction Pipeline

## Goal

Build the agent-assisted workflow for creating manifests from SDEF dictionaries. This enables distributed contributions from people who own different macOS apps.

## Key Deliverables

1. **Extraction Agent Workflow**
   - Claude Code skill or Agent SDK workflow
   - Takes SDEF file as input
   - Produces complete manifest folder as output
   - Human review checkpoints throughout

2. **Mechanical Extraction Step**
   - Fully automated SDEF → RawSdefData (from Phase 2)
   - Preserve all structural information
   - No judgment calls in this step

3. **Hierarchy Resolution Agent**
   - Analyze element containment
   - Propose resource hierarchy
   - Flag ambiguities for review:
     - Resources with multiple parents
     - Circular references
     - Resource vs value type classification

4. **Type Probing System**
   - Generate JXA probe scripts
   - Execute probes against running app (with permission)
   - Observe actual return value types
   - Map to standardized type representations
   - Mark low-confidence type assignments

5. **API Surface Design Agent**
   - Design SDK surface following established patterns
   - Compare against official APIs where they exist
   - Create pattern proposal notes for novel patterns
   - Ensure consistency with existing manifests

6. **Creation Context Identification**
   - Identify all instantiation patterns
   - Map `make` command to resources
   - Identify other commands that create resources
   - Propose factory methods

7. **Confidence Scoring System**
   - Score each extraction area (hierarchy, types, patterns, etc.)
   - Overall confidence score
   - Detailed notes explaining uncertainty
   - Identification of what blocks generation

8. **Open Questions Generation**
   - Structured questions for human review
   - Agent's recommendation with confidence
   - Flag whether question blocks generation
   - Pattern proposals for novel patterns

9. **Validation Suite**
   - Schema consistency checks
   - Naming convention validation
   - Hierarchy validity checks
   - Cross-reference validation

## Contributor Workflow

```bash
# 1. Extract SDEF from installed app
macts extract-dictionary "OmniFocus"
# → Creates omnifocus.sdef

# 2. Run extraction agent
macts generate-manifest ./omnifocus.sdef
# Agent runs, produces:
# → manifests/omnifocus/app.yaml
# → manifests/omnifocus/schemas/...
# → manifests/omnifocus/confidence.yaml
# → manifests/omnifocus/open-questions.yaml

# 3. Review and answer open questions
# Human edits files or responds to prompts

# 4. Run validation
macts validate-manifest ./manifests/omnifocus
# → Checks pass/fail

# 5. Generate SDK (dry run)
macts generate-sdk ./manifests/omnifocus --dry-run
# → Verifies generation would succeed

# 6. Open PR
# → PR includes manifest + confidence report + resolved questions
```

## Dependencies

- Phase 0 (project foundation)
- Phase 1 (manifest schemas)
- Phase 2 (SDEF parser)
- Phase 3 (JXA bridge - for type probing)

## Critical Files

```
packages/core/src/
├── extraction/
│   ├── index.ts              # Public API
│   ├── workflow.ts           # Orchestrates extraction steps
│   ├── hierarchy-resolver.ts # Hierarchy analysis
│   ├── type-prober.ts        # Runtime type probing
│   ├── api-designer.ts       # API surface design
│   ├── creation-contexts.ts  # Instantiation pattern detection
│   ├── confidence.ts         # Confidence scoring
│   ├── open-questions.ts     # Question generation
│   └── validation.ts         # Validation suite

packages/cli/src/
├── commands/
│   ├── extract-dictionary.ts # Extract SDEF from app
│   ├── generate-manifest.ts  # Run extraction agent
│   └── validate-manifest.ts  # Run validation

# Claude Code skill (optional)
.claude/skills/
└── generate-manifest/
    ├── skill.yaml
    └── skill.md
```

## Confidence Report Schema

```yaml
# manifests/omnifocus/confidence.yaml
extraction:
  timestamp: '2026-02-15T10:30:00Z'
  sdefPath: './omnifocus.sdef'
  appVersion: '4.0'
  macosVersion: '15.0'
  typeProbesExecuted: true

confidence:
  hierarchy:
    score: 0.85
    notes:
      - 'Clear parent-child for most resources'
      - 'Tag appears in both Project and Task - modeled as child of both'

  typeNarrowing:
    score: 0.72
    notes:
      - 'Runtime probing confirmed 22 of 30 properties'
      - '8 properties returned inconsistent types'
      - 'Deferred date type unclear - string vs Date'

  instantiationPatterns:
    score: 0.90
    notes:
      - 'All resources have clear creation contexts'

  valueTypeClassification:
    score: 0.95
    notes:
      - '5 value types identified, all confirmed'

  inheritanceModeling:
    score: 0.60
    notes:
      - 'Complex Task/Project inheritance unclear'
      - 'Recommend human review'

  overallConfidence: 0.80
```

## Open Questions Schema

```yaml
# manifests/omnifocus/open-questions.yaml
questions:
  - id: OQ-001
    area: hierarchy
    question: 'Task can contain other Tasks (subtasks). Should we model this as self-referential hierarchy?'
    agentRecommendation: 'Yes, add Task as child of Task with access: rw'
    confidence: 0.85
    blocksGeneration: false

  - id: OQ-002
    area: typeNarrowing
    question: "The 'defer date' property sometimes returns null, sometimes empty string. Which represents 'not set'?"
    agentRecommendation: 'Treat both as null, normalize in SDK'
    confidence: 0.60
    blocksGeneration: true # Need answer before generation

  - id: OQ-003
    area: patterns
    question: "OmniFocus has 'complete' command that marks tasks done. Model as command or as update to 'completed' property?"
    agentRecommendation: 'Model as command for semantic clarity'
    confidence: 0.75
    blocksGeneration: false
    patternProposal: false # Follows existing command pattern
```

## Success Criteria

- [ ] `macts extract-dictionary "App"` extracts SDEF from any scriptable app
- [ ] `macts generate-manifest` produces valid manifest structure
- [ ] Confidence report identifies low-confidence areas accurately
- [ ] Open questions are specific and actionable
- [ ] Type probing works when app is available
- [ ] Falls back gracefully when app is not available
- [ ] Validation suite catches real errors
- [ ] Complete workflow tested with OmniFocus or another complex app
- [ ] Documentation for contributors
