import { describe, it, expect } from 'vitest';
import {
  SuiteSchema,
  DeprecationSchema,
  ConfidenceSchema,
  OpenQuestionSchema,
  TccEntitlementSchema,
  DistributionModelSchema,
  AppMetadataSchema,
  ExtractionMetadataSchema,
} from './metadata.js';

describe('SuiteSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal suite with only name', () => {
      const result = SuiteSchema.parse({
        name: 'Standard Suite',
      });

      expect(result).toEqual({
        name: 'Standard Suite',
        resources: [],
        commands: [],
        enums: [],
      });
    });

    it('should accept suite with all fields', () => {
      const result = SuiteSchema.parse({
        name: 'Standard Suite',
        description: 'Common classes and commands',
        code: 'core',
        resources: ['document', 'window'],
        commands: ['open', 'close'],
        enums: ['saveOptions'],
      });

      expect(result).toEqual({
        name: 'Standard Suite',
        description: 'Common classes and commands',
        code: 'core',
        resources: ['document', 'window'],
        commands: ['open', 'close'],
        enums: ['saveOptions'],
      });
    });

    it('should accept suite with empty arrays', () => {
      const result = SuiteSchema.parse({
        name: 'Empty Suite',
        resources: [],
        commands: [],
        enums: [],
      });

      expect(result.resources).toEqual([]);
      expect(result.commands).toEqual([]);
      expect(result.enums).toEqual([]);
    });

    it('should accept suite with four-character code', () => {
      const result = SuiteSchema.parse({
        name: 'Calendar Suite',
        code: 'iCal',
      });

      expect(result.code).toBe('iCal');
    });
  });

  describe('negative cases', () => {
    it('should reject suite without name', () => {
      expect(() => {
        SuiteSchema.parse({
          description: 'Missing name',
        });
      }).toThrow();
    });

    it('should reject suite with invalid code length', () => {
      expect(() => {
        SuiteSchema.parse({
          name: 'Standard Suite',
          code: 'too-long',
        });
      }).toThrow();
    });

    it('should reject suite with code that is too short', () => {
      expect(() => {
        SuiteSchema.parse({
          name: 'Standard Suite',
          code: 'abc',
        });
      }).toThrow();
    });

    it('should reject suite with non-array resources', () => {
      expect(() => {
        SuiteSchema.parse({
          name: 'Standard Suite',
          resources: 'document',
        });
      }).toThrow();
    });
  });
});

describe('DeprecationSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal deprecation with only message', () => {
      const result = DeprecationSchema.parse({
        message: 'Use newMethod instead',
      });

      expect(result).toEqual({
        message: 'Use newMethod instead',
        upstream: true,
      });
    });

    it('should accept deprecation with all fields', () => {
      const result = DeprecationSchema.parse({
        message: 'This method is deprecated',
        since: '10.14',
        upstream: false,
        replacement: 'modernMethod',
      });

      expect(result).toEqual({
        message: 'This method is deprecated',
        since: '10.14',
        upstream: false,
        replacement: 'modernMethod',
      });
    });

    it('should default upstream to true', () => {
      const result = DeprecationSchema.parse({
        message: 'Deprecated by Apple',
      });

      expect(result.upstream).toBe(true);
    });

    it('should accept upstream deprecation explicitly', () => {
      const result = DeprecationSchema.parse({
        message: 'Deprecated in macOS 13',
        upstream: true,
      });

      expect(result.upstream).toBe(true);
    });
  });

  describe('negative cases', () => {
    it('should reject deprecation without message', () => {
      expect(() => {
        DeprecationSchema.parse({
          since: '10.14',
        });
      }).toThrow();
    });

    it('should reject deprecation with non-boolean upstream', () => {
      expect(() => {
        DeprecationSchema.parse({
          message: 'Deprecated',
          upstream: 'yes',
        });
      }).toThrow();
    });
  });
});

describe('ConfidenceSchema', () => {
  describe('positive cases', () => {
    it('should accept confidence at minimum boundary (0)', () => {
      const result = ConfidenceSchema.parse({
        overall: 0,
      });

      expect(result.overall).toBe(0);
    });

    it('should accept confidence at maximum boundary (1)', () => {
      const result = ConfidenceSchema.parse({
        overall: 1,
      });

      expect(result.overall).toBe(1);
    });

    it('should accept confidence with valid range', () => {
      const result = ConfidenceSchema.parse({
        overall: 0.85,
      });

      expect(result.overall).toBe(0.85);
    });

    it('should accept confidence with per-field scores', () => {
      const result = ConfidenceSchema.parse({
        overall: 0.9,
        fields: {
          name: 1.0,
          description: 0.8,
          parameters: 0.85,
        },
      });

      expect(result.fields).toEqual({
        name: 1.0,
        description: 0.8,
        parameters: 0.85,
      });
    });

    it('should accept confidence without fields', () => {
      const result = ConfidenceSchema.parse({
        overall: 0.75,
      });

      expect(result.fields).toBeUndefined();
    });

    it('should accept field scores at boundaries', () => {
      const result = ConfidenceSchema.parse({
        overall: 0.5,
        fields: {
          min: 0,
          max: 1,
        },
      });

      expect(result.fields).toEqual({
        min: 0,
        max: 1,
      });
    });
  });

  describe('negative cases', () => {
    it('should reject confidence below 0', () => {
      expect(() => {
        ConfidenceSchema.parse({
          overall: -0.1,
        });
      }).toThrow();
    });

    it('should reject confidence above 1', () => {
      expect(() => {
        ConfidenceSchema.parse({
          overall: 1.5,
        });
      }).toThrow();
    });

    it('should reject field score below 0', () => {
      expect(() => {
        ConfidenceSchema.parse({
          overall: 0.8,
          fields: {
            name: -0.5,
          },
        });
      }).toThrow();
    });

    it('should reject field score above 1', () => {
      expect(() => {
        ConfidenceSchema.parse({
          overall: 0.8,
          fields: {
            name: 1.2,
          },
        });
      }).toThrow();
    });

    it('should reject confidence without overall', () => {
      expect(() => {
        ConfidenceSchema.parse({
          fields: {
            name: 0.9,
          },
        });
      }).toThrow();
    });
  });
});

describe('OpenQuestionSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal question with only text', () => {
      const result = OpenQuestionSchema.parse({
        question: 'Is this property read-only?',
      });

      expect(result.question).toBe('Is this property read-only?');
    });

    it('should accept question with all fields', () => {
      const result = OpenQuestionSchema.parse({
        question: 'What is the return type?',
        context: 'Method has undocumented return value',
        suggestions: ['string', 'number', 'boolean'],
        relatedTo: 'Calendar.createEvent',
      });

      expect(result).toEqual({
        question: 'What is the return type?',
        context: 'Method has undocumented return value',
        suggestions: ['string', 'number', 'boolean'],
        relatedTo: 'Calendar.createEvent',
      });
    });

    it('should accept question with suggestions', () => {
      const result = OpenQuestionSchema.parse({
        question: 'What is the correct enum name?',
        suggestions: ['SaveOptions', 'saveOptions', 'save_options'],
      });

      expect(result.suggestions).toEqual(['SaveOptions', 'saveOptions', 'save_options']);
    });

    it('should accept question with context', () => {
      const result = OpenQuestionSchema.parse({
        question: 'Should this be deprecated?',
        context: 'API removed in macOS 13 but still documented',
      });

      expect(result.context).toBe('API removed in macOS 13 but still documented');
    });

    it('should accept question related to a resource', () => {
      const result = OpenQuestionSchema.parse({
        question: 'Does this inherit from Document?',
        relatedTo: 'TextDocument',
      });

      expect(result.relatedTo).toBe('TextDocument');
    });
  });

  describe('negative cases', () => {
    it('should reject question without text', () => {
      expect(() => {
        OpenQuestionSchema.parse({
          context: 'Missing question',
        });
      }).toThrow();
    });

    it('should reject question with non-array suggestions', () => {
      expect(() => {
        OpenQuestionSchema.parse({
          question: 'What is the type?',
          suggestions: 'string',
        });
      }).toThrow();
    });
  });
});

describe('TccEntitlementSchema', () => {
  describe('positive cases', () => {
    it('should accept calendar entitlement', () => {
      const result = TccEntitlementSchema.parse('calendar');
      expect(result).toBe('calendar');
    });

    it('should accept contacts entitlement', () => {
      const result = TccEntitlementSchema.parse('contacts');
      expect(result).toBe('contacts');
    });

    it('should accept reminders entitlement', () => {
      const result = TccEntitlementSchema.parse('reminders');
      expect(result).toBe('reminders');
    });

    it('should accept photos entitlement', () => {
      const result = TccEntitlementSchema.parse('photos');
      expect(result).toBe('photos');
    });

    it('should accept music entitlement', () => {
      const result = TccEntitlementSchema.parse('music');
      expect(result).toBe('music');
    });

    it('should accept files entitlement', () => {
      const result = TccEntitlementSchema.parse('files');
      expect(result).toBe('files');
    });

    it('should accept accessibility entitlement', () => {
      const result = TccEntitlementSchema.parse('accessibility');
      expect(result).toBe('accessibility');
    });

    it('should accept automation entitlement', () => {
      const result = TccEntitlementSchema.parse('automation');
      expect(result).toBe('automation');
    });
  });

  describe('negative cases', () => {
    it('should reject invalid entitlement', () => {
      expect(() => {
        TccEntitlementSchema.parse('camera');
      }).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => {
        TccEntitlementSchema.parse('');
      }).toThrow();
    });
  });
});

describe('DistributionModelSchema', () => {
  describe('positive cases', () => {
    it('should accept app-store', () => {
      const result = DistributionModelSchema.parse('app-store');
      expect(result).toBe('app-store');
    });

    it('should accept developer-id', () => {
      const result = DistributionModelSchema.parse('developer-id');
      expect(result).toBe('developer-id');
    });

    it('should accept system', () => {
      const result = DistributionModelSchema.parse('system');
      expect(result).toBe('system');
    });
  });

  describe('negative cases', () => {
    it('should reject invalid distribution model', () => {
      expect(() => {
        DistributionModelSchema.parse('enterprise');
      }).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => {
        DistributionModelSchema.parse('');
      }).toThrow();
    });
  });
});

describe('AppMetadataSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal app metadata', () => {
      const result = AppMetadataSchema.parse({
        bundleId: 'com.apple.iCal',
        name: 'Calendar',
      });

      expect(result).toEqual({
        bundleId: 'com.apple.iCal',
        name: 'Calendar',
        tccEntitlements: [],
      });
    });

    it('should accept app metadata with all fields', () => {
      const result = AppMetadataSchema.parse({
        bundleId: 'com.apple.iCal',
        name: 'Calendar',
        displayName: 'Calendar',
        version: '15.0',
        minMacOSVersion: '13.0',
        icon: '/Applications/Calendar.app/Contents/Resources/App.icns',
        tccEntitlements: ['calendar', 'reminders', 'contacts'],
        distributionModel: 'system',
      });

      expect(result).toEqual({
        bundleId: 'com.apple.iCal',
        name: 'Calendar',
        displayName: 'Calendar',
        version: '15.0',
        minMacOSVersion: '13.0',
        icon: '/Applications/Calendar.app/Contents/Resources/App.icns',
        tccEntitlements: ['calendar', 'reminders', 'contacts'],
        distributionModel: 'system',
      });
    });

    it('should accept app metadata with TCC entitlements', () => {
      const result = AppMetadataSchema.parse({
        bundleId: 'com.apple.Music',
        name: 'Music',
        tccEntitlements: ['music'],
      });

      expect(result.tccEntitlements).toEqual(['music']);
    });

    it('should default tccEntitlements to empty array', () => {
      const result = AppMetadataSchema.parse({
        bundleId: 'com.example.app',
        name: 'ExampleApp',
      });

      expect(result.tccEntitlements).toEqual([]);
    });

    it('should accept valid bundle ID formats', () => {
      const result1 = AppMetadataSchema.parse({
        bundleId: 'com.apple.iCal',
        name: 'Calendar',
      });
      expect(result1.bundleId).toBe('com.apple.iCal');

      const result2 = AppMetadataSchema.parse({
        bundleId: 'com.example.app-name',
        name: 'App',
      });
      expect(result2.bundleId).toBe('com.example.app-name');

      const result3 = AppMetadataSchema.parse({
        bundleId: 'io.github.user.app',
        name: 'App',
      });
      expect(result3.bundleId).toBe('io.github.user.app');
    });
  });

  describe('negative cases', () => {
    it('should reject app metadata without bundleId', () => {
      expect(() => {
        AppMetadataSchema.parse({
          name: 'Calendar',
        });
      }).toThrow();
    });

    it('should reject app metadata without name', () => {
      expect(() => {
        AppMetadataSchema.parse({
          bundleId: 'com.apple.iCal',
        });
      }).toThrow();
    });

    it('should reject invalid TCC entitlement', () => {
      expect(() => {
        AppMetadataSchema.parse({
          bundleId: 'com.apple.iCal',
          name: 'Calendar',
          tccEntitlements: ['calendar', 'invalid-entitlement'],
        });
      }).toThrow();
    });

    it('should reject invalid distribution model', () => {
      expect(() => {
        AppMetadataSchema.parse({
          bundleId: 'com.apple.iCal',
          name: 'Calendar',
          distributionModel: 'unknown',
        });
      }).toThrow();
    });

    it('should reject non-array tccEntitlements', () => {
      expect(() => {
        AppMetadataSchema.parse({
          bundleId: 'com.apple.iCal',
          name: 'Calendar',
          tccEntitlements: 'calendar',
        });
      }).toThrow();
    });
  });
});

describe('ExtractionMetadataSchema', () => {
  describe('positive cases', () => {
    it('should accept minimal extraction metadata', () => {
      const result = ExtractionMetadataSchema.parse({});

      expect(result).toEqual({
        openQuestions: [],
      });
    });

    it('should accept extraction metadata with all fields', () => {
      const result = ExtractionMetadataSchema.parse({
        extractedAt: '2024-01-15T10:30:00Z',
        mactsVersion: '1.0.0',
        sourceFile: 'Calendar.sdef',
        confidence: {
          overall: 0.9,
          fields: {
            resources: 0.95,
            commands: 0.85,
          },
        },
        openQuestions: [
          {
            question: 'Is this property read-only?',
            context: 'No access modifiers in dictionary',
          },
        ],
      });

      expect(result).toEqual({
        extractedAt: '2024-01-15T10:30:00Z',
        mactsVersion: '1.0.0',
        sourceFile: 'Calendar.sdef',
        confidence: {
          overall: 0.9,
          fields: {
            resources: 0.95,
            commands: 0.85,
          },
        },
        openQuestions: [
          {
            question: 'Is this property read-only?',
            context: 'No access modifiers in dictionary',
          },
        ],
      });
    });

    it('should accept extraction metadata with confidence', () => {
      const result = ExtractionMetadataSchema.parse({
        confidence: {
          overall: 0.85,
        },
      });

      expect(result.confidence?.overall).toBe(0.85);
    });

    it('should accept extraction metadata with open questions', () => {
      const result = ExtractionMetadataSchema.parse({
        openQuestions: [
          {
            question: 'What is the return type?',
            suggestions: ['string', 'number'],
          },
          {
            question: 'Should this be deprecated?',
          },
        ],
      });

      expect(result.openQuestions).toHaveLength(2);
    });

    it('should accept valid ISO 8601 datetime', () => {
      const result = ExtractionMetadataSchema.parse({
        extractedAt: '2024-01-15T10:30:00Z',
      });

      expect(result.extractedAt).toBe('2024-01-15T10:30:00Z');
    });

    it('should default openQuestions to empty array', () => {
      const result = ExtractionMetadataSchema.parse({
        mactsVersion: '1.0.0',
      });

      expect(result.openQuestions).toEqual([]);
    });
  });

  describe('negative cases', () => {
    it('should reject invalid datetime format', () => {
      expect(() => {
        ExtractionMetadataSchema.parse({
          extractedAt: '2024-01-15',
        });
      }).toThrow();
    });

    it('should reject invalid confidence', () => {
      expect(() => {
        ExtractionMetadataSchema.parse({
          confidence: {
            overall: 1.5,
          },
        });
      }).toThrow();
    });

    it('should reject non-array openQuestions', () => {
      expect(() => {
        ExtractionMetadataSchema.parse({
          openQuestions: 'What is the type?',
        });
      }).toThrow();
    });

    it('should reject invalid open question', () => {
      expect(() => {
        ExtractionMetadataSchema.parse({
          openQuestions: [
            {
              // Missing required 'question' field
              context: 'Some context',
            },
          ],
        });
      }).toThrow();
    });
  });
});
