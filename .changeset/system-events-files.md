---
'@macts/system-events': minor
---

System Events disk items, folders and domains can now be read.

- `diskItems.get(posixPath)` and `folders.get(posixPath)` read the disk item or folder at a POSIX path. A folder get at the path of something that is not a folder fails as not found. There is no list of disk items or folders: System Events does not list the file system.
- `domains.list()` and `domains.get(id)` read the file system's domains.
- `userDomainObjects` and `classicDomainObjects` read the user domain and the Classic domain, which System Events holds as properties of the application: `get('user')` and `get('classic')` read one by its kind, and `list()` returns the one the app has.
- A folder field (a domain's folders, a disk item's `container`) is now in output as a reference to the folder or disk item, which resolves through these gets.
- A domain holds only the folders its kind of domain has, so all 13 domain folders are nullable: a read-only probe found each missing on some of the 5 domains, so a read the app reports missing is `null` rather than a failed get or list. For the Application Support, Applications and Library folders, one domain answers the folder's id but reports it missing when its POSIX path is read; the probe that found this read each folder as the SDK does. The user and Classic domains inherit these claims.
- The user domain's Sites folder is nullable too: it exists only once the user creates one, so a read the app reports missing is `null`.

A disk item and a folder are identified by their POSIX path. The path names a location, not an item: it finds whatever is at that path now, so a reference does not follow an item that is moved or renamed.

**Breaking changes for 0.2.0 users:**

- `pOSIXPath` is renamed `posixPath` on disk items and folders.
- `id` no longer identifies a disk item or a folder, because System Events cannot look one up by it. `DiskItem.id` and `Folder.id` are now typed `string | null`, like any field without evidence that the app always sets it.
- `UserDomainObject.id` and `ClassicDomainObject.id` are now `string | null`; their non-null identifying field is `kind`.
- The Classic domain's folders that current macOS does not have are removed from its record: the Apple Menu Items, Control Panels, Control Strip Modules, Desktop, Extensions, Fonts, Launcher Items, Shutdown Items, Startup Items and System folders, and the Desktop Pictures, Folder Action Scripts, Scripting Additions, Shared Documents, Speakable Items and Utilities folders it inherits from a domain. Every read of them fails on macOS 27.2, which has no Classic environment. Its Preferences folder stays.
