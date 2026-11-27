'use strict';

var assign = require('min-dash').assign;

var lineIcon = require('../../util/LineIcon');

var PRIORITY = 600;

var ICONS = {
  copy: lineIcon('<rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/>'),
  cut: lineIcon('<circle cx="7" cy="17" r="2.6"/><circle cx="17" cy="17" r="2.6"/><path d="M8.8 15.2 17 4M15.2 15.2 7 4"/>'),
  paste: lineIcon('<rect x="5" y="5" width="14" height="16" rx="1.5"/><rect x="9" y="3" width="6" height="4" rx="1"/>' +
    '<path d="M9 12h6M9 16h4"/>')
};


/**
 * What a shape's Copy and Cut take: the selection when the shape is in it,
 * else the shape alone.
 *
 * @param {djs.model.Base} element
 * @param {Array<djs.model.Base>} selected
 *
 * @return {Array<djs.model.Base>}
 */
function copyTargets(element, selected) {
  return selected.indexOf(element) !== -1 ? selected : [ element ];
}


/**
 * Copy and Cut in the context pad's tools of a shape, and Paste in those of a
 * shape a paste can go into while something is copied, so a touch screen can
 * copy and paste without a keyboard. The copying and pasting is copyPaste's.
 *
 * What shows where comes from the `contextPadClipboardRules` service.
 * The entries are in the 'edit' group, before the context pad tools module
 * puts the tools in order.
 */
function ContextPadClipboard(contextPad, copyPaste, clipboard, selection, contextPadClipboardRules) {

  var rules = contextPadClipboardRules;

  contextPad.registerProvider(PRIORITY, {
    getContextPadEntries: function(element) {
      return function(entries) {

        // shapes only: a connection goes along with the shapes at its ends
        if (element.waypoints || element.labelTarget) {
          return entries;
        }

        var added = {};

        if (rules.canCopy(element)) {
          added.copy = {
            group: 'edit',
            imageUrl: ICONS.copy,
            title: 'Copy',
            action: {
              click: function() {
                copyPaste.copy(copyTargets(element, selection.get()));
              }
            }
          };

          added.cut = {
            group: 'edit',
            imageUrl: ICONS.cut,
            title: 'Cut',
            action: {
              click: function() {
                copyPaste.cut(copyTargets(element, selection.get()));
              }
            }
          };
        }

        if (!clipboard.isEmpty() && rules.canPasteInto(element)) {
          added.paste = {
            group: 'edit',
            imageUrl: ICONS.paste,
            title: 'Paste',
            action: {
              click: function() {

                // in the middle of the shape pasted into
                var point = {
                  x: (element.x || 0) + (element.width || 0) / 2,
                  y: (element.y || 0) + (element.height || 0) / 2
                };

                copyPaste.paste({ element: element, point: point });
              }
            }
          };
        }

        return assign({}, entries, added);
      };
    }
  });
}

ContextPadClipboard.$inject = [ 'contextPad', 'copyPaste', 'clipboard', 'selection', 'contextPadClipboardRules' ];

module.exports = ContextPadClipboard;

module.exports.copyTargets = copyTargets;
