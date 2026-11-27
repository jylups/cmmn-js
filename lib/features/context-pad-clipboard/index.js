'use strict';

/**
 * Copy, Cut and Paste in the context pad, as an optional module:
 *
 *   var Modeler = require('@jylups/cmmn-js/lib/Modeler');
 *   var contextPadClipboardModule = require('@jylups/cmmn-js/lib/features/context-pad-clipboard');
 *
 *   new Modeler({ additionalModules: [ contextPadClipboardModule ] });
 *
 * It needs the modeler's copy and paste. A host can replace the
 * `contextPadClipboardRules` service (what shows where), or the `clipboard`
 * service, to share one clipboard between modelers:
 *
 *   { clipboard: [ 'value', sharedClipboard ] }
 */
module.exports = {
  __init__: [ 'contextPadClipboard' ],
  contextPadClipboard: [ 'type', require('./ContextPadClipboard') ],
  contextPadClipboardRules: [ 'value', require('./ClipboardRules') ]
};
