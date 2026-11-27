'use strict';

var assign = require('min-dash').assign;

/**
 * The order of the tools, as in Flowable Design; other tools keep theirs,
 * after these.
 */
var TOOL_ORDER = [ 'replace', 'connect', 'copy', 'cut', 'paste', 'delete', 'help' ];

var PRIORITY = 500;


/**
 * Puts Connect with the tools (the 'edit' group), the tools first and in
 * Flowable Design's order, then the append actions.
 *
 * @param {Object} entries context pad entries, by action
 *
 * @return {Object}
 */
function regroupTools(entries) {
  var tools = {},
      others = {},
      result = {};

  Object.keys(entries).forEach(function(action) {
    var entry = entries[action];

    if (entry.group === 'edit' || action === 'connect') {
      tools[action] = assign({}, entry, { group: 'edit' });
    } else {
      others[action] = entry;
    }
  });

  function rank(action) {
    var index = TOOL_ORDER.indexOf(action);

    return index === -1 ? TOOL_ORDER.length : index;
  }

  Object.keys(tools).map(function(action, index) {
    return { action: action, rank: rank(action), index: index };
  }).sort(function(a, b) {
    return (a.rank - b.rank) || (a.index - b.index);
  }).forEach(function(tool) {
    result[tool.action] = tools[tool.action];
  });

  return assign(result, others);
}


/**
 * The context pad's tools together, in Flowable Design's order, after the
 * other providers added theirs (cmmn-js's at priority 1000, the clipboard's
 * and help's at 600).
 */
function ContextPadTools(contextPad) {
  contextPad.registerProvider(PRIORITY, {
    getContextPadEntries: function() {
      return regroupTools;
    }
  });
}

ContextPadTools.$inject = [ 'contextPad' ];

module.exports = ContextPadTools;

module.exports.TOOL_ORDER = TOOL_ORDER;
module.exports.regroupTools = regroupTools;
