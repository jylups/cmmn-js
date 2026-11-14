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
