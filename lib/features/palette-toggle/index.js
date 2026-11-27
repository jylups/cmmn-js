'use strict';

/**
 * A button that collapses the palette and shows it again, as an optional
 * module:
 *
 *   var paletteToggleModule = require('@jylups/cmmn-js/lib/features/palette-toggle');
 *
 *   new Modeler({ additionalModules: [ paletteToggleModule ], paletteToggle: { open: true } });
 *
 * Its look is in assets/cmmn-js-flowable-tools.css. It uses only diagram-js's
 * palette, so other diagram-js modelers can load it too.
 */
module.exports = {
  __init__: [ 'paletteToggle' ],
  paletteToggle: [ 'type', require('./PaletteToggle') ]
};
