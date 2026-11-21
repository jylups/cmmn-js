'use strict';

var EDITOR_SELECTOR = '.djs-direct-editing-content';


/**
 * Label editing with touch gestures. Neither part changes anything for a
 * mouse.
 *
 * - A double tap opens the label editor from touchend, and iOS then moves the
 *   focus away as part of the tap, which can close the editor before the user
 *   types. Cancelling that touchend and focusing the editor again keeps it
 *   open. iOS shows the keyboard only when the user taps the editor itself.
 * - cmmn-js finishes an edit on element.mousedown, drag.init or a viewbox
 *   change, and a tap sends only element.click: a tap on the canvas finishes
 *   it here. With a mouse, the mousedown before the click has finished it.
 *
 * @param {EventBus} eventBus
 * @param {DirectEditing} directEditing
 */
function TouchLabelEditing(eventBus, directEditing) {
  var justOpened = false;

  eventBus.on('directEditing.activate', function() {
    justOpened = true;
  });

  eventBus.on('canvas.init', function(event) {
    var container = event.svg.parentElement;

    if (!container) {
      return;
    }

    // registered after the touch gestures' listener on the canvas, which
    // opens the editor, so this runs after it for the same touchend
    container.addEventListener('touchend', function(touchEvent) {
      if (!justOpened) {
        return;
      }

      justOpened = false;
      touchEvent.preventDefault();

      var editor = container.querySelector(EDITOR_SELECTOR);

      if (editor) {
        editor.focus();
      }
    });
  });

  eventBus.on('element.click', function() {
    justOpened = false;

    if (directEditing.isActive()) {
      directEditing.complete();
    }
  });
}

TouchLabelEditing.$inject = [ 'eventBus', 'directEditing' ];

module.exports = TouchLabelEditing;

module.exports.EDITOR_SELECTOR = EDITOR_SELECTOR;
