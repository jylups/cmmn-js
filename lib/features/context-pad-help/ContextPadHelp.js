'use strict';

var assign = require('min-dash').assign;

var lineIcon = require('../../util/LineIcon');

var helpUrl = require('./HelpPages').helpUrl;

var PRIORITY = 600;

// a question mark
var HELP_ICON = lineIcon('<path d="M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.2v.7"/><path d="M12 18h.01"/>');


function openInBrowser(url) {
  window.open(url, '_blank', 'noopener');
}


/**
 * Help in the context pad's tools, as in Flowable Design: it opens the page
 * that explains the element, Flowable's reference page for its type.
 *
 * Configured with `help`:
 * - `url(element)`: the page for an element, or null for none; the default
 *   gives Flowable's CMMN reference pages (see HelpPages.js);
 * - `open(url, element)`: opens the page; the default opens it in a new
 *   browser tab;
 * - `title`: the entry's title ('Help').
 */
function ContextPadHelp(contextPad, config) {
  config = config || {};

  var pageFor = config.url || helpUrl,
      open = config.open || openInBrowser,
      title = config.title || 'Help';

  contextPad.registerProvider(PRIORITY, {
    getContextPadEntries: function(element) {
      return function(entries) {
        var url = pageFor(element);

        if (!url) {
          return entries;
        }

        return assign({}, entries, {
          help: {
            group: 'edit',
            imageUrl: HELP_ICON,
            title: title,
            action: {
              click: function() {
                open(url, element);
              }
            }
          }
        });
      };
    }
  });
}

ContextPadHelp.$inject = [ 'contextPad', 'config.help' ];

module.exports = ContextPadHelp;
