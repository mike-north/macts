/**
 * Tests for the acronym-aware word split, and the lower camel case built on
 * it, that spell every resource segment, generated binding and MCP operation.
 *
 * Each expected value is written by hand from the rule in `lower-camel.ts`: a
 * leading capital run is an acronym and is lowercased, except its last capital
 * when that capital begins the next word; a lone plural `s` after the run is
 * part of the acronym; later capitals are kept.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D2
 * @see https://github.com/mike-north/macts/issues/154
 */

import { describe, expect, it } from 'vitest'
import { lowerCamel, splitIdentifierWords } from './lower-camel.js'

describe('lowerCamel', () => {
  it('lowercases the first letter of a single word', () => {
    expect(lowerCamel('Notes')).toBe('notes')
    expect(lowerCamel('Calendars')).toBe('calendars')
  })

  it('keeps the capitals that start later words', () => {
    expect(lowerCamel('MediaItems')).toBe('mediaItems')
    expect(lowerCamel('OmniFocus')).toBe('omniFocus')
    expect(lowerCamel('OpenFileAlarms')).toBe('openFileAlarms')
  })

  it('lowercases a leading acronym, keeping the capital that starts the next word', () => {
    expect(lowerCamel('AIMHandles')).toBe('aimHandles')
    expect(lowerCamel('ICQHandles')).toBe('icqHandles')
    expect(lowerCamel('XMLParser')).toBe('xmlParser')
    expect(lowerCamel('UIElements')).toBe('uiElements')
  })

  it("treats a lone `s` after a leading acronym as the acronym's plural", () => {
    // `URLs` is the plural of the acronym URL, not `UR` followed by a word `Ls`.
    expect(lowerCamel('URLs')).toBe('urls')
    expect(lowerCamel('IDs')).toBe('ids')
    // The plural `s` is followed by the next word's capital, so it still closes the acronym.
    expect(lowerCamel('URLsList')).toBe('urlsList')
  })

  it('lowercases a name that is all capitals', () => {
    expect(lowerCamel('TV')).toBe('tv')
    expect(lowerCamel('URL')).toBe('url')
  })

  it('lowercases a leading acronym followed by digits, keeping the rest', () => {
    // A digit does not start a word, so the whole run is the acronym.
    expect(lowerCamel('ID3Tags')).toBe('id3Tags')
    expect(lowerCamel('Mp3Files')).toBe('mp3Files')
  })

  it('keeps acronyms after the first word as written', () => {
    // Only the leading run changes; `CD` mid-name is already lower camel case.
    expect(lowerCamel('AudioCDTracks')).toBe('audioCDTracks')
  })

  it('leaves a name that already starts in lower case unchanged', () => {
    expect(lowerCamel('iTerm')).toBe('iTerm')
    expect(lowerCamel('notes')).toBe('notes')
    expect(lowerCamel('mediaItems')).toBe('mediaItems')
  })

  it('leaves the empty string unchanged', () => {
    expect(lowerCamel('')).toBe('')
  })
})

describe('splitIdentifierWords', () => {
  it('splits Pascal and camel case at each capital that starts a word', () => {
    expect(splitIdentifierWords('MediaItems')).toEqual(['Media', 'Items'])
    expect(splitIdentifierWords('splitVertically')).toEqual(['split', 'Vertically'])
  })

  it('keeps a run of capitals together as one acronym', () => {
    // The run's last capital starts the next word when a lower-case letter follows.
    expect(splitIdentifierWords('invokeAPIExpression')).toEqual(['invoke', 'API', 'Expression'])
    expect(splitIdentifierWords('AIMHandles')).toEqual(['AIM', 'Handles'])
    expect(splitIdentifierWords('getURL')).toEqual(['get', 'URL'])
    expect(splitIdentifierWords('TV')).toEqual(['TV'])
  })

  it("keeps an acronym's plural s with the acronym", () => {
    expect(splitIdentifierWords('URLs')).toEqual(['URLs'])
    expect(splitIdentifierWords('listURLs')).toEqual(['list', 'URLs'])
    expect(splitIdentifierWords('URLsList')).toEqual(['URLs', 'List'])
  })

  it('keeps digits with the word before them', () => {
    expect(splitIdentifierWords('ID3Tags')).toEqual(['ID3', 'Tags'])
    expect(splitIdentifierWords('Mp3Files')).toEqual(['Mp3', 'Files'])
  })

  it('keeps acronyms after the first word as their own words', () => {
    expect(splitIdentifierWords('AudioCDTracks')).toEqual(['Audio', 'CD', 'Tracks'])
  })

  it('treats any other character as a separator', () => {
    expect(splitIdentifierWords('Bookmark Folders')).toEqual(['Bookmark', 'Folders'])
    expect(splitIdentifierWords('do_script')).toEqual(['do', 'script'])
  })

  it('has no words for the empty string', () => {
    expect(splitIdentifierWords('')).toEqual([])
  })
})
