'use strict';

/**
 * The context pad as in Flowable Design, as an optional module:
 *
 *   var contextPadToolsModule = require('@jylups/cmmn-js/lib/features/context-pad-tools');
 *
 *   new Modeler({
 *     additionalModules: [ contextPadToolsModule ],
 *     contextPadPosition: { visibleRight: function() { return drawer.getBoundingClientRect().left; } }
 *   });
 *
 * The tools (change type, connect, copy, cut, paste, delete, help) go
 * together, in Flowable Design's order, left of the selected shape, and the
 * append actions right of it; the pad stays on screen. The split's look is in
 * assets/cmmn-js-flowable-tools.css.
 *
 * It uses only diagram-js's context pad, so other diagram-js modelers can load
 * it too.
 */
module.exports = {
  __init__: [ 'contextPadTools', 'contextPadPosition' ],
  contextPadTools: [ 'type', require('./ContextPadTools') ],
  contextPadPosition: [ 'type', require('./ContextPadPosition') ]
};
