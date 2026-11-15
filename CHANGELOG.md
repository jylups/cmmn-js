# Changelog

All notable changes to [@jylups/cmmn-js](https://github.com/jylups/cmmn-js) are documented here. We use [semantic versioning](http://semver.org/) for releases. Versions up to `0.20.0` were published as [cmmn-js](https://github.com/bpmn-io/cmmn-js) by bpmn.io.

## Unreleased

___Note:__ Yet to be released changes appear here._

* `FEAT`: explain the problems of an opened model in plain language with the `problems` service: what is lost on save or not shown, and what is kept but not recognised; mark the elements with problems on the canvas, and list what saving removes ([jylups/cmmn-js-env#47](https://github.com/jylups/cmmn-js-env/issues/47))
* `FIX`: open models without a diagram on an empty diagram, with an import warning that their elements are not shown; what is drawn on it is saved, and the model saves as it was read while nothing is drawn ([jylups/cmmn-js-env#42](https://github.com/jylups/cmmn-js-env/issues/42))
* `FEAT`: use the sentry of a criterion written as `flowable:sentryRef`, as some Flowable models do, and save it as `flowable:sentryRef` again ([jylups/cmmn-js-env#41](https://github.com/jylups/cmmn-js-env/issues/41))
* `FEAT`: draw sentry connectors of Flowable models, whose `cmmndi:CMMNEdge` references the plan item and the criterion instead of the on-part, and save each edge in the form it was read; new connectors between a plan item and a criterion are saved in Flowable's form ([jylups/cmmn-js-env#40](https://github.com/jylups/cmmn-js-env/issues/40))
* `CHORE`: publish prerelease versions under the `next` dist-tag
* `DEPS`: update to `diagram-js@15.29.0`, `diagram-js-direct-editing@3.6.0`, `min-dash@5`, `min-dom@5`, `tiny-svg@4` and `object-refs@0.4`
* `FEAT`: show the selection outline in the viewer and the navigated viewer too
* `DEPS`: update to `@jylups/cmmn-moddle@6`; the viewer uses its Promise based `fromXML` and `toXML`, and `importXML` and `saveXML` keep their callbacks
* `CHORE`: provide replace menu entries through the `getPopupMenuEntries` and `getPopupMenuHeaderEntries` methods of the popup menu provider interface
* `FEAT`: keep criteria attached to a stage or case plan model in place when it is resized, if possible
* `FIX`: show the day of the month in the build date of the distribution banner
* `CHORE`: build the distribution with Rollup and Babel 7, and bundle the tests with webpack 5, instead of browserify and Babel 6

### Breaking Changes

Connecting and reconnecting follow [diagram-js 6](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#600):

* The commands and rules `connection.reconnectStart` and `connection.reconnectEnd` are replaced by `connection.reconnect`. Use `Modeling#reconnect` to change source and target together.
* Swapping source and target while connecting or moving a connection end is decided by diagram-js, not by the `connection.create` and `connection.reconnect` rules; their results no longer carry a `reverse` flag.
* `Create#start` takes a context as its third argument: `{ source: element }`.

diagram-js [7](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#700) and [8](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#800) bring further changes for extensions:

* `element.mousedown`, `element.mouseup`, `element.click` and `element.dblclick` also fire for the auxiliary (middle) mouse button. Listeners that should only react to the primary button must check it, for example with `isPrimaryButton` from `diagram-js/lib/util/Mouse`.
* The canvas supports several root elements. `Canvas#setRootElement` adds and shows a root instead of replacing the current one; to replace it, set the new root and remove the old one with `Canvas#removeRootElement`.

diagram-js [9](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#900) to [12](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#1200):

* diagram-js and its helper libraries ship ES2018 code. The `dist/` bundles are still transpiled to ES5; applications that bundle `lib/` themselves must transpile these dependencies if they support older browsers.
* `ReplaceMenuProvider#getEntries` and `#getHeaderEntries` are replaced by `#getPopupMenuEntries` and `#getPopupMenuHeaderEntries`, which return the entries as an object by ID.
* The markup and CSS classes of the popup menu changed, and `.djs-parent` replaces `.djs-container` as the root selector of the canvas and the popup menu.
* Model elements are created through the factory functions of `diagram-js/lib/model` only; use the helpers in `diagram-js/lib/util/ModelUtil` (for example `isLabel`) instead of `instanceof` checks.
* The selection outline is 5px instead of 6px away from the element.

diagram-js [13](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#1300) to [15](https://github.com/bpmn-io/diagram-js/blob/develop/CHANGELOG.md#1500):

* The keyboard binds to the canvas, which is focusable now, and shortcuts work while it has focus. `keyboard.bindTo` is no longer supported; set `keyboard.bind` to `false` to turn the shortcuts off. Components that take the focus from the canvas must give it back with `Canvas#restoreFocus`.
* The `Outline` subclass in `lib/features/outline` is replaced by an outline provider (`cmmnOutlineProvider`) for the diagram-js `outline` module, which also draws the outline around multiple selected elements. Outlines are created when an element is hovered or selected. The viewers include the module now, because the diagram-js `selection` module no longer brings it.
* `SHIFT + click` adds an element to the selection; `CTRL + click` no longer does. The touch interaction module is removed.
* diagram-js-direct-editing 3 shows no background while editing the label of an element with a fixed size.
* min-dom 5 and tiny-svg 4 are ES modules only, and object-refs exports `Refs` by name.

## 0.21.0

* `FIX`: keep importing a diagram when one of its connections cannot be drawn; the error is reported as an import warning
* `CHORE`: publish as `@jylups/cmmn-js`, a maintained fork of `cmmn-js`
* `CHORE`: depend on `@jylups/cmmn-moddle`
* `CHORE`: run the tests in the installed Google Chrome instead of PhantomJS and puppeteer
* `CHORE`: build on GitHub Actions and publish to npm from GitHub releases

## 0.20.0

* `CHORE`: apply new project watermark
* `CHORE`: clarify license terms

## 0.19.2

* `FIX`: es5ify

## 0.19.1

* `FIX`: provide missing `connection.updateWaypoints` rule

## 0.19.0

* `FEAT`: improve connect snapping
* `FEAT`: snap to source and target dockings
* `FEAT`: add connect previews
* `CHORE`: bump to `diagram-js@4.0.1`

## 0.18.1

* `FIX`: prevent HTML injection in search
* `FIX`: prevent HTML injection in direct editing component
* `CHORE`: bump to `diagram-js@3.3.1`

## 0.18.0

* `CHORE`: bump to `diagram-js@3.3.0`

## 0.17.1

* `FIX`: update to `tiny-svg@2.2.1` to circumvent MS Edge bug

## 0.17.0

* `FEAT`: add lifecycle events for `Viewer#saveXML`
* `CHORE`: bump to `diagram-js@3.1`

## 0.16.0

* `FEAT`: add ability to move selection with keyboard arrows
* `FEAT`: support `SHIFT` modifier to move elements / canvas with keyboard arrows at accelerated speed
* `FEAT`: require `Ctrl/Cmd` to be pressed as a modifier key to move the canvas via keyboard errors
* `FEAT`: auto-expand elements when children resize
* `CHORE`: bind editor actions and keyboard shortcuts for explicitly added features only
* `CHORE`: update to [`diagram-js@3.0.0`](https://github.com/bpmn-io/diagram-js/blob/master/CHANGELOG.md#300)

### Breaking Changes

* `CmmnGlobalConnect` provider got removed. Use `connection.start` rule to decide whether an element can start a connection.
* `EditorActions` / `Keyboard` do not pull in features implicitly anymore. If you roll your own editor, include features you would like to ship with manually to provide the respective actions / keyboard bindings.
* Moving the canvas with keyboard arrows now requires the `Ctrl/Cmd` modifiers to be pressed.

## 0.15.2

* `FIX`: correct horizontal embedded label alignment

## 0.15.1

* `FIX`: correct case plan model label positioning

## 0.15.0

* `CHORE`: bump to `diagram-js@2`
* `CHORE`: bump to `diagram-js-direct-editing@1.3.0`

## 0.14.5

* `CHORE`: bump dependency versions
* `FIX`: correct line-breaks vanishing during direct editing in IE

## 0.14.4

* `CHORE`: update to `diagram-js@1.3.0`
* `FIX`: focus label editing box on element creation

## 0.14.3

* `FIX`: escape `data-element-id` in CSS selectors

## 0.14.2

* `CHORE`: be able to consume library without `add-module-exports` transform

## 0.14.1

_Rebuild of un-published v0.14.0._

## 0.14.0

### Breaking Changes

* `CHORE`: migrate to `diagram-js@1`
* `FEAT`: build upon ES module foundations. You must use `babelify` + `babel-plugin-add-module-exports` to build custom variants of `cmmn-js` now

## 0.13.0

* `CHORE`: bump to [`diagram-js@0.31.0`](https://github.com/bpmn-io/diagram-js/releases/tag/v0.31.0)

## ...

Check `git log` for earlier history.
