/**
 * Native reads of System Events disk items, folders and domains, from the
 * shipped manifest, against a stand-in System Events.
 *
 * Expected outcomes are written by hand from phases/13 and from read-only
 * observations of System Events 1.3.6 on macOS 27.2:
 *
 * - D10, "Key targeting": a disk item and a folder are found by their POSIX
 *   path through their collection's key (`diskItems.byName(path)`,
 *   `folders.byName(path)`). The folders' key finds only folders: at a
 *   file's path the app reports no such object (-1728, observed
 *   2026-11-04T04:44:08Z), and D4 maps -1728 to a missing target. So a
 *   folder got, or a folder reference resolved, at a file's path fails as
 *   `TargetNotFoundError`, while the disk item get finds the file.
 * - D10, "Singleton roots": the user domain is the application's
 *   `userDomain` property, got by its kind.
 * - D10, "Nullability and resettability evidence": a domain folder the app
 *   reports missing (-1728) on some domains and reads on others (probed
 *   2026-11-04T04:41:36Z, and for the Application Support, Applications and
 *   Library folders, read as the body reads them, folder then POSIX path, on
 *   2026-11-05T03:10:09.000Z) is nullable on that evidence, so a read failing
 *   that way, after the domain itself was found, is `null`; the user domain
 *   inherits those claims. A folder with no such evidence (the user domain's
 *   home folder) that fails the same way still fails the read. A Classic folder marked unsupported is not
 *   read at all.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D4, D10)
 * @see `sdef /System/Library/CoreServices/System\ Events.app`, classes
 *   `disk item`, `folder` and `user domain object`
 */

import { resolve as resolvePath } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  TargetNotFoundError,
  UnexpectedValueError,
  type ResourcePlanTable,
  type ValuePlan,
  type WireRecord,
} from '@macts/contracts'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/index.js'
import { createNativeExecutor } from './native-executor.js'
import { buildNativeBody, referenceAddressing } from './native-scripts.js'
import { standInTransport } from './test-support/stand-in-app.js'

const MANIFEST_PATH = resolvePath(process.cwd(), '../../manifests/system-events/app.yaml')

let manifest: AppManifest
beforeAll(async () => {
  manifest = await loadManifest(MANIFEST_PATH)
})

const text = (): ValuePlan => ({ kind: 'string' })
const nullable = (value: ValuePlan): ValuePlan => ({ kind: 'nullable', value })

/** Disk items and folders are identified by a POSIX path, a string. */
const RESOURCE_PLANS: ResourcePlanTable = {
  DiskItem: { id: text() },
  Folder: { id: text() },
}

/** The part of a disk item record these cases read: its key and its name. */
const ITEM_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    posixPath: { presence: 'required', value: text() },
    name: { presence: 'required', value: nullable(text()) },
  },
}

const PATH_INPUT: ValuePlan = {
  kind: 'record',
  fields: { posixPath: { presence: 'required', value: text() } },
}

const HOME = '/Users/someone'
const FILE = '/Users/someone/notes.txt'

/** A failure the app raises, carrying its native error number. */
function appError(errorNumber: number): Error {
  return Object.assign(new Error('The app failed.'), { errorNumber })
}

/** What the app hands back for a key that names nothing of the class: -1728 on use. */
const NO_SUCH_OBJECT = {
  exists: () => {
    throw appError(-1728)
  },
}

/** A stand-in disk item at `posixPath`. */
function item(posixPath: string, name: string) {
  return {
    exists: () => true,
    properties: () => ({ posixPath, name }),
    posixPath: () => posixPath,
  }
}

/**
 * A stand-in System Events: a home folder and a file in it. The disk items'
 * key finds both; the folders' key finds only the folder, as the app's does.
 */
function standInSystemEvents() {
  const home = item(HOME, 'someone')
  const file = item(FILE, 'notes.txt')
  const diskItems = new Map<unknown, unknown>([
    [HOME, home],
    [FILE, file],
  ])
  return {
    includeStandardAdditions: false,
    diskItems: { byName: (key: unknown) => diskItems.get(key) ?? NO_SUCH_OBJECT },
    folders: { byName: (key: unknown) => (key === HOME ? home : NO_SUCH_OBJECT) },
  }
}

/** Run `command` on `resource` against `app`. */
function execute(app: object, command: string, resource: string, input: WireRecord) {
  return createNativeExecutor({ transport: standInTransport(app) }).execute({
    manifest,
    target: { command, resource },
    input,
    inputPlan: PATH_INPUT,
    outputPlan: ITEM_PLAN,
    resourcePlans: RESOURCE_PLANS,
  })
}

/** Resolve an identity reference to `resource` at `posixPath` against `app`. */
function resolveReference(app: object, resource: string, posixPath: string) {
  return createNativeExecutor({ transport: standInTransport(app) }).resolve({
    manifest,
    reference: { resource, form: 'identity', cardinality: 'one', id: posixPath } as never,
    outputPlan: ITEM_PLAN,
    resourcePlans: RESOURCE_PLANS,
  })
}

/** What a call rejected with; fails if it resolved. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the call to reject')
}

describe('System Events disk items and folders in native bodies', () => {
  it('gets a disk item and a folder by POSIX path through their collection key', () => {
    expect(buildNativeBody(manifest, { command: 'getDiskItem', resource: 'DiskItem' })).toContain(
      'var item = app["diskItems"].byName(itemId);'
    )
    expect(buildNativeBody(manifest, { command: 'getFolder', resource: 'Folder' })).toContain(
      'var item = app["folders"].byName(itemId);'
    )
  })

  it('addresses a folder reference through the folders key, reading its POSIX path back', () => {
    expect(referenceAddressing(manifest, 'Folder')).toEqual({
      collection: 'folders',
      lookup: 'byKey',
      property: 'posixPath',
    })
  })

  it('gets the user domain through the application property its kind names', () => {
    const body = buildNativeBody(manifest, {
      command: 'getUserDomainObject',
      resource: 'UserDomainObject',
    })
    expect(body).toContain('var roots = {"user":"userDomain"};')
    expect(body).toContain('var item = app[roots[itemKind]];')
  })
})

describe('System Events disk items and folders against a stand-in', () => {
  it('gets the folder at a folder path, and the disk item at a file path', async () => {
    const app = standInSystemEvents()
    await expect(execute(app, 'getFolder', 'Folder', { posixPath: HOME })).resolves.toEqual({
      posixPath: HOME,
      name: 'someone',
    })
    await expect(execute(app, 'getDiskItem', 'DiskItem', { posixPath: FILE })).resolves.toEqual({
      posixPath: FILE,
      name: 'notes.txt',
    })
  })

  it('fails a folder got at a file path as a missing target', async () => {
    const error = await rejectionOf(
      execute(standInSystemEvents(), 'getFolder', 'Folder', { posixPath: FILE })
    )
    expect(error).toBeInstanceOf(TargetNotFoundError)
  })

  it('fails a folder reference to a file path as a missing target', async () => {
    const error = await rejectionOf(resolveReference(standInSystemEvents(), 'Folder', FILE))
    expect(error).toBeInstanceOf(TargetNotFoundError)
  })

  it('resolves a disk item reference to the same file path', async () => {
    await expect(resolveReference(standInSystemEvents(), 'DiskItem', FILE)).resolves.toEqual({
      posixPath: FILE,
      name: 'notes.txt',
    })
  })
})

/** A domain record's plan, as far as these cases read it: its id and two folders. */
const DOMAIN_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    id: { presence: 'required', value: nullable(text()) },
    applicationsFolder: { presence: 'required', value: nullable(FOLDER_REF()) },
    fontsFolder: { presence: 'required', value: nullable(FOLDER_REF()) },
  },
}

/** A user domain record's plan, as far as these cases read it. */
const USER_DOMAIN_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    kind: { presence: 'required', value: { kind: 'enum', members: ['user'] } },
    homeFolder: { presence: 'required', value: nullable(FOLDER_REF()) },
    desktopPicturesFolder: { presence: 'required', value: nullable(FOLDER_REF()) },
  },
}

/** A user domain record's plan, as far as the Sites folder cases read it. */
const SITES_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    kind: { presence: 'required', value: { kind: 'enum', members: ['user'] } },
    homeFolder: { presence: 'required', value: nullable(FOLDER_REF()) },
    sitesFolder: { presence: 'required', value: nullable(FOLDER_REF()) },
  },
}

/** A reference to a folder, by its POSIX path. */
function FOLDER_REF(): ValuePlan {
  return { kind: 'reference', resource: 'Folder', cardinality: 'one' }
}

/** The wire form of a reference to the folder at `posixPath`. */
function folderRef(posixPath: string) {
  return { reference: { resource: 'Folder', form: 'identity', cardinality: 'one', id: posixPath } }
}

/** A member that fails with the app's error `errorNumber` whenever it is read. */
function failing(errorNumber: number) {
  return () => {
    throw appError(errorNumber)
  }
}

/**
 * A stand-in folder the app holds in a property record but reports missing
 * (-1728) when its POSIX path is read.
 */
function missingFolder() {
  return { exists: () => false, posixPath: failing(-1728) }
}

/** A stand-in folder the app reads back by its POSIX path. */
function folder(posixPath: string) {
  return { exists: () => true, posixPath: () => posixPath }
}

/**
 * A stand-in System Events whose domain `d1` holds the Applications folder,
 * and whose user domain holds the home folder, each listing the folders its
 * property record reports in `record`; `members` adds direct reads, such as
 * one the app fails.
 */
function standInDomains(options: {
  domain?: { record: Record<string, unknown>; members?: Record<string, unknown> }
  user?: { record: Record<string, unknown>; members?: Record<string, unknown> }
}) {
  /** An object reporting `record` as its property record, and reading each of its properties on its own too. */
  const object = (part?: {
    record: Record<string, unknown>
    members?: Record<string, unknown>
  }) => ({
    exists: () => true,
    properties: () => ({ ...part?.record }),
    ...Object.fromEntries(
      Object.entries(part?.record ?? {}).map(([key, value]) => [key, () => value])
    ),
    ...part?.members,
  })
  const domain = {
    ...object(options.domain),
    properties: () => ({ id: 'd1', ...options.domain?.record }),
  }
  const user = object(options.user)
  return {
    includeStandardAdditions: false,
    domains: { byId: (id: unknown) => (id === 'd1' ? domain : NO_SUCH_OBJECT) },
    userDomain: user,
  }
}

/** Run a get of `command` on `resource` with `input`, reading records of `outputPlan`. */
function get(
  app: object,
  command: string,
  resource: string,
  input: WireRecord,
  inputPlan: ValuePlan,
  outputPlan: ValuePlan
) {
  return createNativeExecutor({ transport: standInTransport(app) }).execute({
    manifest,
    target: { command, resource },
    input,
    inputPlan,
    outputPlan,
    resourcePlans: RESOURCE_PLANS,
  })
}

const ID_INPUT: ValuePlan = {
  kind: 'record',
  fields: { id: { presence: 'required', value: text() } },
}

const KIND_INPUT: ValuePlan = {
  kind: 'record',
  fields: { kind: { presence: 'required', value: { kind: 'enum', members: ['user'] } } },
}

const APPLICATIONS = '/Applications'
const HOME_FOLDER = '/Users/someone'

describe('System Events domain folders the app reports missing', () => {
  it('reads a domain folder the app reports missing as null', async () => {
    const app = standInDomains({
      domain: {
        record: { applicationsFolder: folder(APPLICATIONS) },
        members: { fontsFolder: failing(-1728) },
      },
    })
    await expect(
      get(app, 'getDomain', 'Domain', { id: 'd1' }, ID_INPUT, DOMAIN_PLAN)
    ).resolves.toEqual({ id: 'd1', applicationsFolder: folderRef(APPLICATIONS), fontsFolder: null })
  })

  // Regression: a listed domain's get failed as a missing target, because
  // the get took a folder from the domain's property record, and the app
  // reported that folder missing only when its path was read for the
  // reference. A folder claimed absent-as-null is read on its own instead.
  it('reads a domain folder the app reports missing as null even when its property record holds one', async () => {
    const app = standInDomains({
      domain: {
        record: { applicationsFolder: folder(APPLICATIONS), fontsFolder: missingFolder() },
        members: { fontsFolder: failing(-1728) },
      },
    })
    await expect(
      get(app, 'getDomain', 'Domain', { id: 'd1' }, ID_INPUT, DOMAIN_PLAN)
    ).resolves.toEqual({ id: 'd1', applicationsFolder: folderRef(APPLICATIONS), fontsFolder: null })
  })

  // Regression: the app can hand back a folder it reports missing (-1728)
  // only when the folder's path is read for the reference. For a folder
  // whose evidence makes that failure its empty value, the codec takes it as
  // null wherever the folder came from: a direct read here, a column read in
  // a list below.
  it('reads as null a domain folder the app reports missing only when its path is read', async () => {
    const app = standInDomains({
      domain: {
        record: { applicationsFolder: folder(APPLICATIONS) },
        members: { fontsFolder: () => missingFolder() },
      },
    })
    await expect(
      get(app, 'getDomain', 'Domain', { id: 'd1' }, ID_INPUT, DOMAIN_PLAN)
    ).resolves.toEqual({ id: 'd1', applicationsFolder: folderRef(APPLICATIONS), fontsFolder: null })
  })

  it('lists as null a domain folder the column read returns but the app reports missing when its path is read', async () => {
    const d1 = { id: () => 'd1' }
    const d2 = { id: () => 'd2' }
    const domains = Object.assign(() => [d1, d2], {
      id: () => ['d1', 'd2'],
      applicationsFolder: () => [folder(APPLICATIONS), folder('/System/Applications')],
      fontsFolder: () => [folder('/Library/Fonts'), missingFolder()],
    })
    const app = { includeStandardAdditions: false, domains }
    await expect(
      createNativeExecutor({ transport: standInTransport(app) }).execute({
        manifest,
        target: { command: 'listDomains', resource: 'Domain' },
        input: {},
        inputPlan: { kind: 'record', fields: {} },
        outputPlan: { kind: 'array', items: DOMAIN_PLAN },
        resourcePlans: RESOURCE_PLANS,
      })
    ).resolves.toEqual([
      {
        id: 'd1',
        applicationsFolder: folderRef(APPLICATIONS),
        fontsFolder: folderRef('/Library/Fonts'),
      },
      { id: 'd2', applicationsFolder: folderRef('/System/Applications'), fontsFolder: null },
    ])
  })

  // The same list, when the app fails the column read and the body falls
  // back to reading each domain's folder on its own: a read that fails with
  // -1728 and a read that returns a folder missing only when its path is
  // read both list as null, and a readable folder as its reference.
  it('lists as null a domain folder read item by item, whether its read or its path read reports it missing', async () => {
    const domain = (id: string, fontsFolder: () => unknown) => ({ id: () => id, fontsFolder })
    const d1 = domain('d1', () => folder('/Library/Fonts'))
    const d2 = domain('d2', () => missingFolder())
    const d3 = domain('d3', failing(-1728))
    const domains = Object.assign(() => [d1, d2, d3], {
      id: () => ['d1', 'd2', 'd3'],
      applicationsFolder: () => [folder(APPLICATIONS), folder(APPLICATIONS), folder(APPLICATIONS)],
      fontsFolder: failing(-1728),
    })
    const app = { includeStandardAdditions: false, domains }
    await expect(
      createNativeExecutor({ transport: standInTransport(app) }).execute({
        manifest,
        target: { command: 'listDomains', resource: 'Domain' },
        input: {},
        inputPlan: { kind: 'record', fields: {} },
        outputPlan: { kind: 'array', items: DOMAIN_PLAN },
        resourcePlans: RESOURCE_PLANS,
      })
    ).resolves.toEqual([
      {
        id: 'd1',
        applicationsFolder: folderRef(APPLICATIONS),
        fontsFolder: folderRef('/Library/Fonts'),
      },
      { id: 'd2', applicationsFolder: folderRef(APPLICATIONS), fontsFolder: null },
      { id: 'd3', applicationsFolder: folderRef(APPLICATIONS), fontsFolder: null },
    ])
  })

  // Every domain folder has evidence of absence; the user domain's own home
  // folder has none, so the same failures on it still fail the read.
  it('fails a folder with no evidence of absence that the app reports missing only when its path is read', async () => {
    const app = standInDomains({
      user: { record: { homeFolder: missingFolder(), desktopPicturesFolder: null } },
    })
    const error = await rejectionOf(
      get(
        app,
        'getUserDomainObject',
        'UserDomainObject',
        { kind: 'user' },
        KIND_INPUT,
        USER_DOMAIN_PLAN
      )
    )
    expect(error).toBeInstanceOf(TargetNotFoundError)
  })

  it('fails a folder with no evidence of absence that the app reports missing', async () => {
    const app = standInDomains({
      user: { record: { desktopPicturesFolder: null }, members: { homeFolder: failing(-1728) } },
    })
    const error = await rejectionOf(
      get(
        app,
        'getUserDomainObject',
        'UserDomainObject',
        { kind: 'user' },
        KIND_INPUT,
        USER_DOMAIN_PLAN
      )
    )
    expect(error).toBeInstanceOf(UnexpectedValueError)
  })

  it('fails any other error on a domain folder with evidence of absence', async () => {
    const app = standInDomains({
      domain: {
        record: { applicationsFolder: folder(APPLICATIONS) },
        members: { fontsFolder: failing(-1700) },
      },
    })
    const error = await rejectionOf(
      get(app, 'getDomain', 'Domain', { id: 'd1' }, ID_INPUT, DOMAIN_PLAN)
    )
    expect(error).toBeInstanceOf(UnexpectedValueError)
  })

  it('reads an inherited domain folder the user domain reports missing as null', async () => {
    const app = standInDomains({
      user: {
        record: { homeFolder: folder(HOME_FOLDER) },
        members: { desktopPicturesFolder: failing(-1728) },
      },
    })
    await expect(
      get(
        app,
        'getUserDomainObject',
        'UserDomainObject',
        { kind: 'user' },
        KIND_INPUT,
        USER_DOMAIN_PLAN
      )
    ).resolves.toEqual({
      kind: 'user',
      homeFolder: folderRef(HOME_FOLDER),
      desktopPicturesFolder: null,
    })
  })

  it("reads the user's Sites folder, curated as missing until the user creates one, as null", async () => {
    const app = standInDomains({
      user: {
        record: { homeFolder: folder(HOME_FOLDER), sitesFolder: missingFolder() },
        members: { sitesFolder: failing(-1728) },
      },
    })
    await expect(
      get(app, 'getUserDomainObject', 'UserDomainObject', { kind: 'user' }, KIND_INPUT, SITES_PLAN)
    ).resolves.toEqual({ kind: 'user', homeFolder: folderRef(HOME_FOLDER), sitesFolder: null })
  })

  it("fails any other error on the user's Sites folder", async () => {
    const app = standInDomains({
      user: {
        record: { homeFolder: folder(HOME_FOLDER) },
        members: { sitesFolder: failing(-1700) },
      },
    })
    const error = await rejectionOf(
      get(app, 'getUserDomainObject', 'UserDomainObject', { kind: 'user' }, KIND_INPUT, SITES_PLAN)
    )
    expect(error).toBeInstanceOf(UnexpectedValueError)
  })

  it('reads none of the Classic domain folders marked unsupported', () => {
    const body = buildNativeBody(manifest, {
      command: 'getClassicDomainObject',
      resource: 'ClassicDomainObject',
    })
    // One the Classic domain declares, and one it inherits from a domain.
    expect(body).not.toContain('"appleMenuFolder"')
    expect(body).not.toContain('"desktopPicturesFolder"')
    expect(body).toContain('"preferencesFolder"')
    expect(body).toContain('"scriptsFolder"')
  })
})

// The live list of 2026-11-05 failed on one domain whose Application
// Support, Applications and Library folders answer their id but report no
// such object when their POSIX path, which the codec reads as each folder's
// identity, is read (probe of 2026-11-05T03:10:09.000Z, 1 of 5 domains).
// On that evidence each such folder is null, and the rest of the list reads.
describe('the domain list the live run failed', () => {
  it('lists as null the folders a domain answers by id but not by path', async () => {
    const answersOnlyItsId = () => ({ id: () => 'opaque', posixPath: failing(-1728) })
    const domains = Object.assign(() => [{ id: () => 'd1' }, { id: () => 'd2' }], {
      id: () => ['d1', 'd2'],
      applicationsFolder: () => [folder(APPLICATIONS), answersOnlyItsId()],
      fontsFolder: () => [folder('/Library/Fonts'), folder('/Library/Fonts')],
    })
    const app = { includeStandardAdditions: false, domains }
    await expect(
      createNativeExecutor({ transport: standInTransport(app) }).execute({
        manifest,
        target: { command: 'listDomains', resource: 'Domain' },
        input: {},
        inputPlan: { kind: 'record', fields: {} },
        outputPlan: { kind: 'array', items: DOMAIN_PLAN },
        resourcePlans: RESOURCE_PLANS,
      })
    ).resolves.toEqual([
      {
        id: 'd1',
        applicationsFolder: folderRef(APPLICATIONS),
        fontsFolder: folderRef('/Library/Fonts'),
      },
      { id: 'd2', applicationsFolder: null, fontsFolder: folderRef('/Library/Fonts') },
    ])
  })
})
