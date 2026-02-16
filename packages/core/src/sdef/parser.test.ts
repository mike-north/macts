/**
 * Tests for SDEF XML parser.
 * Uses real SDEF XML snippets to verify parsing correctness.
 */

import { describe, it, expect } from 'vitest';
import { parseSdef } from './parser.js';

/**
 * Helper to assert that a value is defined and return it with proper typing.
 * This helps TypeScript understand that the value is not undefined after the assertion.
 */
function assertDefined<T>(value: T | undefined): asserts value is T {
  expect(value).toBeDefined();
}

describe('parseSdef', () => {
  it('should parse minimal SDEF with one class', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <class name="document" code="docu" plural="documents">
            <property name="name" code="pnam" type="text" access="r"/>
          </class>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);

    expect(result.title).toBe('Test App');
    expect(result.suites).toHaveLength(1);

    const suite = result.suites[0];
    assertDefined(suite);
    expect(suite.name).toBe('Test Suite');
    expect(suite.code).toBe('test');
    expect(suite.classes).toHaveLength(1);

    const docClass = suite.classes[0];
    assertDefined(docClass);
    expect(docClass.name).toBe('document');
    expect(docClass.code).toBe('docu');
    expect(docClass.plural).toBe('documents');
    expect(docClass.properties).toHaveLength(1);

    const prop = docClass.properties[0];
    assertDefined(prop);
    expect(prop.name).toBe('name');
    expect(prop.code).toBe('pnam');
    expect(prop.type).toBe('text');
    expect(prop.access).toBe('r');
  });

  it('should parse class with multiple properties and elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <class name="window" code="cwin" plural="windows">
            <property name="name" code="pnam" type="text" access="r">
              <description>The window's name</description>
            </property>
            <property name="bounds" code="pbnd" type="rectangle" access="rw">
              <description>The window's bounds</description>
            </property>
            <property name="visible" code="pvis" type="boolean" access="rw"/>
            <element type="document" access="r"/>
            <element type="button" access="r"/>
          </class>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const windowClass = result.suites[0]?.classes[0];
    assertDefined(windowClass);

    expect(windowClass.properties).toHaveLength(3);
    const prop0 = windowClass.properties[0];
    const prop1 = windowClass.properties[1];
    const prop2 = windowClass.properties[2];
    assertDefined(prop0);
    assertDefined(prop1);
    assertDefined(prop2);
    expect(prop0.description).toBe("The window's name");
    expect(prop1.description).toBe("The window's bounds");
    expect(prop1.access).toBe('rw');
    expect(prop2.description).toBeUndefined();

    expect(windowClass.elements).toHaveLength(2);
    const elem0 = windowClass.elements[0];
    const elem1 = windowClass.elements[1];
    assertDefined(elem0);
    assertDefined(elem1);
    expect(elem0.type).toBe('document');
    expect(elem0.access).toBe('r');
    expect(elem1.type).toBe('button');
  });

  it('should parse commands with parameters and results', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <command name="open" code="aevtodoc">
            <description>Open a document</description>
            <direct-parameter type="file">
              <description>The file to open</description>
            </direct-parameter>
            <result type="document">
              <description>The opened document</description>
            </result>
          </command>
          <command name="save" code="coresave">
            <description>Save a document</description>
            <direct-parameter type="document"/>
            <parameter name="in" code="kfil" type="file">
              <description>The file to save to</description>
            </parameter>
            <parameter name="as" code="fltp" type="text" optional="yes">
              <description>The file format</description>
            </parameter>
          </command>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const commands = result.suites[0]?.commands;
    assertDefined(commands);
    expect(commands).toHaveLength(2);

    // Test open command
    const openCmd = commands[0];
    assertDefined(openCmd);
    expect(openCmd.name).toBe('open');
    expect(openCmd.code).toBe('aevtodoc');
    expect(openCmd.description).toBe('Open a document');
    assertDefined(openCmd.directParameter);
    expect(openCmd.directParameter.type).toBe('file');
    expect(openCmd.directParameter.description).toBe('The file to open');
    assertDefined(openCmd.result);
    expect(openCmd.result.type).toBe('document');
    expect(openCmd.result.description).toBe('The opened document');
    expect(openCmd.parameters).toHaveLength(0);

    // Test save command
    const saveCmd = commands[1];
    assertDefined(saveCmd);
    expect(saveCmd.name).toBe('save');
    expect(saveCmd.code).toBe('coresave');
    expect(saveCmd.parameters).toHaveLength(2);
    const param0 = saveCmd.parameters[0];
    const param1 = saveCmd.parameters[1];
    assertDefined(param0);
    assertDefined(param1);
    expect(param0.name).toBe('in');
    expect(param0.code).toBe('kfil');
    expect(param0.type).toBe('file');
    expect(param0.optional).toBeUndefined();
    expect(param1.name).toBe('as');
    expect(param1.optional).toBe(true);
  });

  it('should parse enumerations with values', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <enumeration name="save options" code="savo">
            <description>Options for saving</description>
            <enumerator name="yes" code="yes ">
              <description>Save the file</description>
            </enumerator>
            <enumerator name="no" code="no  ">
              <description>Don't save the file</description>
            </enumerator>
            <enumerator name="ask" code="ask ">
              <description>Ask the user</description>
            </enumerator>
          </enumeration>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const enumerations = result.suites[0]?.enumerations;
    assertDefined(enumerations);
    expect(enumerations).toHaveLength(1);

    const saveOptions = enumerations[0];
    assertDefined(saveOptions);
    expect(saveOptions.name).toBe('save options');
    expect(saveOptions.code).toBe('savo');
    expect(saveOptions.description).toBe('Options for saving');
    expect(saveOptions.values).toHaveLength(3);
    const val0 = saveOptions.values[0];
    const val1 = saveOptions.values[1];
    const val2 = saveOptions.values[2];
    assertDefined(val0);
    assertDefined(val1);
    assertDefined(val2);
    expect(val0.name).toBe('yes');
    expect(val0.code).toBe('yes ');
    expect(val0.description).toBe('Save the file');
    expect(val1.name).toBe('no');
    expect(val2.name).toBe('ask');
  });

  it('should handle inheritance', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <class name="item" code="cobj">
            <property name="id" code="ID  " type="integer" access="r"/>
          </class>
          <class name="document" code="docu" inherits="item">
            <property name="name" code="pnam" type="text" access="rw"/>
          </class>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const classes = result.suites[0]?.classes;
    assertDefined(classes);
    expect(classes).toHaveLength(2);
    const class0 = classes[0];
    const class1 = classes[1];
    assertDefined(class0);
    assertDefined(class1);
    expect(class0.name).toBe('item');
    expect(class0.inherits).toBeUndefined();
    expect(class1.name).toBe('document');
    expect(class1.inherits).toBe('item');
  });

  it('should handle deprecated markers', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <class name="old-class" code="oldc" hidden="yes">
            <property name="old-prop" code="oldp" type="text" access="r" hidden="yes"/>
            <property name="new-prop" code="newp" type="text" access="r"/>
          </class>
          <class name="new-class" code="newc">
            <property name="prop" code="prop" type="text" access="r"/>
          </class>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const classes = result.suites[0]?.classes;
    assertDefined(classes);

    const class0 = classes[0];
    const class1 = classes[1];
    assertDefined(class0);
    assertDefined(class1);
    expect(class0.deprecated).toBe(true);
    const prop0 = class0.properties[0];
    const prop1 = class0.properties[1];
    assertDefined(prop0);
    assertDefined(prop1);
    expect(prop0.deprecated).toBe(true);
    expect(prop1.deprecated).toBeUndefined();
    expect(class1.deprecated).toBeUndefined();
  });

  it('should handle missing optional attributes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Minimal Suite" code="minm">
          <class name="minimal" code="minc">
            <property name="prop" code="prop" type="text" access="r"/>
          </class>
          <command name="minimal" code="minc"/>
          <enumeration name="minimal" code="minc">
            <enumerator name="value" code="valu"/>
          </enumeration>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const suite = result.suites[0];
    assertDefined(suite);

    // Class without plural, inherits, description
    const class0 = suite.classes[0];
    assertDefined(class0);
    expect(class0.plural).toBeUndefined();
    expect(class0.inherits).toBeUndefined();
    expect(class0.description).toBeUndefined();

    // Property without description
    const prop0 = class0.properties[0];
    assertDefined(prop0);
    expect(prop0.description).toBeUndefined();

    // Command without description, parameters, result
    const cmd0 = suite.commands[0];
    assertDefined(cmd0);
    expect(cmd0.description).toBeUndefined();
    expect(cmd0.directParameter).toBeUndefined();
    expect(cmd0.parameters).toHaveLength(0);
    expect(cmd0.result).toBeUndefined();

    // Enumeration without description
    const enum0 = suite.enumerations[0];
    assertDefined(enum0);
    expect(enum0.description).toBeUndefined();
    const val0 = enum0.values[0];
    assertDefined(val0);
    expect(val0.description).toBeUndefined();
  });

  it('should handle multiple suites', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Standard Suite" code="core">
          <class name="application" code="capp"/>
        </suite>
        <suite name="Text Suite" code="TEXT">
          <class name="text" code="ctxt"/>
        </suite>
        <suite name="Custom Suite" code="cust">
          <class name="custom" code="cstm"/>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);

    expect(result.suites).toHaveLength(3);
    const suite0 = result.suites[0];
    const suite1 = result.suites[1];
    const suite2 = result.suites[2];
    assertDefined(suite0);
    assertDefined(suite1);
    assertDefined(suite2);
    expect(suite0.name).toBe('Standard Suite');
    expect(suite0.code).toBe('core');
    expect(suite1.name).toBe('Text Suite');
    expect(suite1.code).toBe('TEXT');
    expect(suite2.name).toBe('Custom Suite');
    expect(suite2.code).toBe('cust');
  });

  it('should handle empty suites', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Empty Suite" code="empt">
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);

    expect(result.suites).toHaveLength(1);
    const suite = result.suites[0];
    assertDefined(suite);
    expect(suite.classes).toHaveLength(0);
    expect(suite.commands).toHaveLength(0);
    expect(suite.enumerations).toHaveLength(0);
  });

  it('should throw error for invalid SDEF', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <not-a-dictionary>
        <suite name="Test Suite" code="test"/>
      </not-a-dictionary>`;

    expect(() => parseSdef(xml)).toThrow('Invalid SDEF: missing <dictionary> root element');
  });

  it('should handle missing title', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary>
        <suite name="Test Suite" code="test"/>
      </dictionary>`;

    const result = parseSdef(xml);

    expect(result.title).toBe('Untitled');
  });
});

describe('parseSdef - edge cases', () => {
  it('should handle class with no properties or elements', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <class name="empty" code="empt"/>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const emptyClass = result.suites[0]?.classes[0];
    assertDefined(emptyClass);

    expect(emptyClass.properties).toHaveLength(0);
    expect(emptyClass.elements).toHaveLength(0);
  });

  it('should preserve four-character codes exactly (including spaces)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <enumeration name="options" code="opts">
            <enumerator name="yes" code="yes "/>
            <enumerator name="no" code="no  "/>
          </enumeration>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const values = result.suites[0]?.enumerations[0]?.values;
    assertDefined(values);

    // Four-character codes often have trailing spaces to pad to 4 chars
    const val0 = values[0];
    const val1 = values[1];
    assertDefined(val0);
    assertDefined(val1);
    expect(val0.code).toBe('yes ');
    expect(val1.code).toBe('no  ');
  });

  it('should handle direct-parameter without description', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <command name="test" code="test">
            <direct-parameter type="text"/>
          </command>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const cmd = result.suites[0]?.commands[0];
    assertDefined(cmd);

    assertDefined(cmd.directParameter);
    expect(cmd.directParameter.type).toBe('text');
    expect(cmd.directParameter.description).toBeUndefined();
  });

  it('should handle result without description', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <dictionary title="Test App">
        <suite name="Test Suite" code="test">
          <command name="test" code="test">
            <result type="boolean"/>
          </command>
        </suite>
      </dictionary>`;

    const result = parseSdef(xml);
    const cmd = result.suites[0]?.commands[0];
    assertDefined(cmd);

    assertDefined(cmd.result);
    expect(cmd.result.type).toBe('boolean');
    expect(cmd.result.description).toBeUndefined();
  });
});
