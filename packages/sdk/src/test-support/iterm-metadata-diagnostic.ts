/**
 * Inert candidate source for a separately reviewed native metadata diagnostic.
 * Importing it never launches an app or executes automation. Its evidence is
 * limited to dictionary adapter metadata, not production SDK record hydration.
 *
 * The dictionary supplies current window (Crwn), current tab (Crtb), window id
 * (ID  ), bounds/frame/position/origin/size and tab index (Indx). Lifecycle
 * commands are create window with default profile (Itrmnwwn), create tab with
 * default profile (Itrmntwn), select (Itrmslct) and close (coreclos). Calls pass
 * no profile name, command text or keystrokes. Default profiles may start shells.
 * The runtime's running(), collection access and Automation display reader are
 * host bridge operations, not dictionary properties. Native execution requires
 * separate approval of this exact candidate; no runner is provided here.
 */
export const ITERM_METADATA_DIAGNOSTIC = String.raw`
function run() {
  var report = { completed: false, cleanupComplete: true, baselinePreserved: true, checks: {}, shapes: [] };
  try { return inspect(report); }
  catch (error) {
    // Even Application construction and baseline discovery can fail. Never let
    // host exception text escape this diagnostic's closed report boundary.
    report.completed = false;
    report.cleanupComplete = false;
    report.errorNumber = error && typeof error.errorNumber === 'number' ? error.errorNumber : 0;
    return report;
  }
}
function inspect(report) {
  var app = Application('com.googlecode.iterm2');
  if (!app.running()) return report;
  var baseline = app.windows.id();
  var owned = [];
  // Ids and native specifiers are opaque in-process ownership data, never output.
  function contains(ids, id) { return ids.indexOf(id) !== -1; }
  function number(error) { return error && typeof error.errorNumber === 'number' ? error.errorNumber : 0; }
  function requireCheck(key, value) {
    report.checks[key] = value === true;
    if (!value) throw { errorNumber: 0 };
  }
  function create() {
    var priorCleanup = report.cleanupComplete;
    // A failed creation may still have produced a window. Without a returned
    // qualified identity, cleanup cannot honestly be reported complete.
    report.cleanupComplete = false;
    var item = app.createWindowWithDefaultProfile();
    var id = item.id();
    if (typeof id !== 'number' || !isFinite(id) || contains(baseline, id) || owned.some(function(row) { return row.id === id; })) {
      // Ambiguous creation is not cleanup authority over another window.
      report.cleanupComplete = false;
      throw { errorNumber: 0 };
    }
    // A valid returned identity is a cleanup candidate even if qualification
    // fails. Cleanup rechecks it against the baseline and the live identity.
    var row = { id: id, window: null, tabs: [] };
    owned.push(row);
    report.cleanupComplete = priorCleanup;
    // Creation results can be positional/current-window specifiers. Qualify the
    // owned identity before any subsequent creation or mutation can shift it.
    var target = app.windows.byId(id);
    if (!target.exists() || target.id() !== id) throw { errorNumber: 0 };
    row.window = target;
    return row;
  }
  function position(item, owner) {
    // Only final collection-qualified positions are accepted; dictionary index
    // is observed separately, never substituted for an address.
    var shown = Automation.getDisplayString(item);
    var match = /\.windows\.byId\((-?[0-9]+)\)\.tabs\.at\((0|[1-9][0-9]*)\)$/.exec(shown);
    if (!match || Number(match[1]) !== owner) throw { errorNumber: 0 };
    var value = Number(match[2]);
    if (value > 9007199254740991) throw { errorNumber: 0 };
    return value;
  }
  function selected(row) { return position(row.window.currentTab(), row.id); }
  function shape(value) {
    if (value === null) return { type: 'null' };
    if (Array.isArray(value)) return { type: 'array', length: value.length, elements: value.map(function(v) { return typeof v; }) };
    // Do not enumerate arbitrary object keys or inspect arbitrary string values.
    if (typeof value === 'object') return { type: 'object', x: typeof value.x, y: typeof value.y, width: typeof value.width, height: typeof value.height };
    return { type: typeof value };
  }
  try {
    var first = create();
    var second = create();
    requireCheck('distinctWindows', first.id !== second.id);
    requireCheck('currentWindowIdentity', app.currentWindow().id() === second.id);
    // New-window creation normally supplies one tab. Refuse other cardinality
    // rather than changing or closing an unaccounted-for tab.
    requireCheck('initialTabCount', first.window.tabs.length === 1 && second.window.tabs.length === 1);
    first.tabs.push(first.window.tabs.at(0));
    first.tabs.push(app.createTabWithDefaultProfile(first.window));
    first.tabs.push(app.createTabWithDefaultProfile(first.window));
    requireCheck('threeTabs', first.window.tabs.length === 3);
    app.select(first.tabs[1]);
    requireCheck('secondPosition', selected(first) === 1);
    requireCheck('secondDictionaryIndex', typeof first.window.tabs.at(1).index() === 'number');
    requireCheck('siblingScope', selected(second) === 0 && second.window.tabs.length === 1);
    app.select(first.tabs[2]);
    requireCheck('thirdPosition', selected(first) === 2);
    // The current selection persists while closing an earlier owned tab. Its
    // position shifts, demonstrating why a saved position is not an identity.
    app.close(first.tabs[0]);
    requireCheck('drift', first.window.tabs.length === 2 && selected(first) === 1);
    app.close(first.window.tabs.at(0));
    // Cardinality evidence only: production SDK error mapping is exercised by
    // separate stand-in tests, not by this projected adapter diagnostic.
    requireCheck('savedPositionBeyondLength', first.window.tabs.length === 1 && selected(first) === 0);
    ['bounds', 'position', 'origin', 'size', 'frame'].forEach(function(field) {
      try { report.shapes.push({ field: field, shape: shape(first.window[field]()) }); }
      catch (error) { report.shapes.push({ field: field, errorNumber: number(error) }); }
    });
    report.completed = true;
  } catch (error) {
    report.errorNumber = number(error);
  } finally {
    // Never close by set difference or guessed position; returned identities
    // are revalidated before closing. No quit or prompt interaction occurs.
    owned.slice().reverse().forEach(function(row) {
      try {
        var target = app.windows.byId(row.id);
        if (!target.exists()) return;
        if (contains(baseline, row.id) || target.id() !== row.id) throw { errorNumber: 0 };
        app.close(target);
      }
      catch (error) { report.cleanupComplete = false; }
    });
    try {
      var after = app.windows.id();
      report.baselinePreserved = baseline.every(function(id) { return contains(after, id); });
      report.cleanupComplete = report.cleanupComplete && owned.every(function(row) { return !contains(after, row.id); });
    } catch (error) { report.cleanupComplete = false; report.baselinePreserved = false; }
  }
  return report;
}
`
