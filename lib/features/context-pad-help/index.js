'use strict';

/**
 * Help in the context pad, as an optional module:
 *
 *   var contextPadHelpModule = require('@jylups/cmmn-js/lib/features/context-pad-help');
 *
 *   new Modeler({
 *     additionalModules: [ contextPadHelpModule ],
 *     help: { open: function(url) { host.openUrl(url); } }
 *   });
 *
 * See ContextPadHelp.js for the options; HelpPages.js has Flowable's pages.
 */
module.exports = {
  __init__: [ 'contextPadHelp' ],
  contextPadHelp: [ 'type', require('./ContextPadHelp') ]
};
