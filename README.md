# @jylups/cmmn-js - CMMN 1.1 for the web

[![CI](https://github.com/jylups/cmmn-js/actions/workflows/ci.yml/badge.svg)](https://github.com/jylups/cmmn-js/actions/workflows/ci.yml)

> Maintained fork of [bpmn-io/cmmn-js](https://github.com/bpmn-io/cmmn-js), which is no longer developed, for the [Flowable CMMN editor](https://github.com/jylups/cmmn-js-env). It is published as `@jylups/cmmn-js` from version `0.21.0`.

View and edit CMMN 1.1 diagrams in the browser.


## Installation

Get the library via the [npm package](https://www.npmjs.com/package/@jylups/cmmn-js):

```bash
npm install @jylups/cmmn-js
```

Bundle it into your web application, or use one of the pre-packaged
distributions in `dist/` (`cmmn-viewer`, `cmmn-navigated-viewer` and
`cmmn-modeler`), which expose a global `CmmnJS`.

```javascript
var CmmnJS = require('@jylups/cmmn-js/lib/Modeler');
```

The [cmmn-js examples](https://github.com/bpmn-io/cmmn-js-examples) of the
original project show more ways to use it.

## Usage

To get started, create a cmmn-js instance
and render [CMMN 1.1 diagrams](http://www.omg.org/spec/CMMN/1.1/) in the browser:

```javascript
var xml; // my CMMN 1.1 xml
var viewer = new CmmnJS({
  container: 'body'
});

viewer.importXML(xml, function(err) {

  if (err) {
    console.log('error rendering', err);
  } else {
    console.log('rendered');
  }
});
```

The [playground](https://github.com/jylups/cmmn-js-env#playground) in the
development environment opens sample diagrams in the viewer and the modeler.


### Keyboard

The modeler's keyboard shortcuts, such as undo, select all or the lasso tool, work while the diagram has the focus; clicking into the diagram gives it the focus. To turn the shortcuts off, set `keyboard.bind` to `false`:

```javascript
var modeler = new CmmnJS({
  container: '#canvas',
  keyboard: {
    bind: false
  }
});
```

The `keyboard.bindTo` option of earlier versions is no longer supported.


### Connectors of Flowable models

CMMN 1.1 references the on-part from the `cmmndi:CMMNEdge` of a sentry connector. Flowable writes the plan item and the criterion the connector joins instead, in either order, and only places edges written that way. cmmn-js reads both forms and saves each edge in the form it was read. New connectors from a plan item to a criterion are saved in Flowable's form, with the plan item first; a connector from an exit criterion stays in the CMMN form, which Flowable's form cannot express.

Some Flowable models write the sentry of a criterion as `flowable:sentryRef` instead of `sentryRef`; Flowable reads both. cmmn-js uses that sentry as the criterion's sentry, and saves it as `flowable:sentryRef` again, with the criterion's current sentry.


### Models without a diagram

CMMN 1.1 allows models without diagram interchange (DI), and many Flowable engine models have none. cmmn-js opens such a model on an empty diagram and reports the import warning `no diagram to display; the elements of <cmmn:Definitions …> are not shown`. Elements drawn on that diagram are saved with it; as long as nothing is drawn, the model saves as it was read, without a diagram.


### Problems of a model

The viewer and the modeler explain the problems of an opened model in plain language, from the warnings of the import: what is lost when the model is saved or not shown (a reference to an ID that is not in the file, content the parser could not read, diagram elements that cannot be shown, a model without a diagram), and what is kept but not recognised (unknown attributes). Elements with a problem that loses something get a marker on the canvas; clicking it selects the element.

```javascript
var problems = modeler.get('problems');

problems.getProblems();         // all problems, the ones that lose something first
problems.getProblems(element);  // the problems of a diagram element
problems.getRemovedOnSave();    // what saving removes, to ask before saving

modeler.on('problems.changed', function(event) {
  // event.problems; a reference that is set, or an element that is removed, leaves the list
});
```

Each problem has a `kind`, a `severity` (`error` or `info`), `removedOnSave`, a `message` and the `element` it concerns. Attributes the editor handles itself, such as `flowable:sentryRef`, are not reported; configure others with `problems: { ignoredAttributes: [ ... ] }`.

Checks add problems the import does not see, for example parts of a model an engine does not read. A check is called with the model's definitions after each import and each change, and returns problems with the model element they concern:

```javascript
problems.addCheck(function(definitions) {
  return [ {
    kind: 'not-read',
    severity: 'info',
    message: 'Case execution listeners are not read by Flowable.',
    businessObject: listener
  } ];
});
```

### Touch

Touch editing is an optional module for the modeler, for tablets and phones:

```javascript
var Modeler = require('@jylups/cmmn-js/lib/Modeler'),
    touchModule = require('@jylups/cmmn-js/lib/features/touch');

var modeler = new Modeler({
  container: '#canvas',
  additionalModules: [ touchModule ]
});
```

Include `assets/cmmn-js-touch.css` too (also in `dist/assets`), for larger touch targets: wider bands around shapes and connections, bigger resize handles, bendpoints and context pad entries.

- **Gestures:**
  - a tap selects and shows the context pad;
  - a drag moves a shape, a bendpoint or a segment;
  - one finger on empty space pans, and two fingers pinch to zoom;
  - a double tap edits a label;
  - a long press shows the context pad.
- **Palette and context pad:** a drag from an entry creates or connects. A tapped create entry waits for a tap on the canvas, and a tap anywhere else cancels it.
- **Only on touch screens:** the module turns itself on only where `(pointer: coarse)` matches, so a desktop with a mouse is unchanged. After a mouse or trackpad press, for example on an iPad with a trackpad, the lasso, space and connect tools work as they do with a mouse.

The gestures come from [bpmn-js-touch-interaction](https://github.com/krasucki/bpmn-js-touch-interaction) (MIT, see `lib/features/touch/LICENSE`).

### Context pad tools

The context pad and palette of Flowable Design come as optional modules for the modeler, contributed by Conscia LLC under the MIT License:

```javascript
var Modeler = require('@jylups/cmmn-js/lib/Modeler');

var modeler = new Modeler({
  container: '#canvas',
  additionalModules: [
    require('@jylups/cmmn-js/lib/features/context-pad-clipboard'),
    require('@jylups/cmmn-js/lib/features/context-pad-tools'),
    require('@jylups/cmmn-js/lib/features/plan-item-resize'),
    require('@jylups/cmmn-js/lib/features/palette-toggle'),
    require('@jylups/cmmn-js/lib/features/context-pad-help')
  ],
  contextPadPosition: { visibleRight: function() { return Infinity; } },
  paletteToggle: { open: true },
  help: { open: function(url) { window.open(url, '_blank', 'noopener'); } }
});
```

Include `assets/cmmn-js-flowable-tools.css` too (also in `dist/assets`), after `cmmn-js-flowable.css`.

- **`context-pad-clipboard`:** Copy and Cut in a shape's tools, and Paste in the case plan's and an expanded stage's tools while something is copied, so a touch screen can copy and paste without a keyboard. Replace the `contextPadClipboardRules` service (`{ canCopy(element), canPasteInto(element) }`) to change what shows where, and the `clipboard` service to share one clipboard between modelers.
- **`context-pad-tools`:** the tools (change type, connect, copy, cut, paste, delete, help) together in Flowable Design's order, left of the selected shape, and the append actions right of it; the pad stays on screen. `contextPadPosition.visibleRight()` gives the screen x where the visible canvas ends, for a host that covers part of it.
- **`plan-item-resize`:** tasks and milestones resizable from their corners, as stages are, down to 60 x 40 and 60 x 24.
- **`palette-toggle`:** a button above the palette that collapses it and shows it again. `paletteToggle` takes `open` (the start state), `onToggle(open)` (for a host that keeps one state for several modelers and calls `paletteToggle.set(open)` on each), `parent` (where the button goes; the container's parent by default) and `labels` (`{ collapse, show }`). It fires `paletteToggle.changed`.
- **`context-pad-help`:** Help opens the page that explains the element, Flowable's CMMN reference page for its type. `help` takes `open(url, element)` (a new browser tab by default), `url(element)` (your own pages; null for none) and `title`.

`context-pad-tools` and `palette-toggle` use only diagram-js, so a bpmn-js modeler can load them too, and the other two with its own rules and pages.

### Dynamic Attach/Detach

You may attach or detach the viewer dynamically to any element on the page, too:

```javascript
var viewer = new CmmnJS();

// attach it to some element
viewer.attachTo('#container');

// detach the panel
viewer.detach();
```


## Resources

*   [Issues](https://github.com/jylups/cmmn-js-env/issues)
*   [Development environment](https://github.com/jylups/cmmn-js-env)
*   [Examples of the original project](https://github.com/bpmn-io/cmmn-js-examples)


## Building the Project

Perform the following steps to build the library, including running all tests:

```bash
cd cmmn-js
npm install
npm run all
```

The tests run in a headless Google Chrome. Set `CHROME_BIN` if Chrome is not
found, or `TEST_BROWSERS` to use other browsers (for example `Chrome,Firefox`).

To work on cmmn-js together with `@jylups/cmmn-moddle`, the Flowable extensions
and the properties panel, use the
[development environment](https://github.com/jylups/cmmn-js-env), which links
them as npm workspaces.

Please checkout our [contributing guidelines](./.github/CONTRIBUTING.md) if you plan to
file an issue or pull request.


## Related

cmmn-js builds on top of a few additional powerful tools:

* [@jylups/cmmn-moddle](https://github.com/jylups/cmmn-moddle): Read / write support for CMMN 1.1 XML in the browsers
* [diagram-js](https://github.com/bpmn-io/diagram-js): Diagram rendering and editing toolkit


## License

Use under the terms of the [bpmn.io license](http://bpmn.io/license).
