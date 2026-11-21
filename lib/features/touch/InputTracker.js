'use strict';

/**
 * Which kind of pointer was pressed last. An iPad with a trackpad or a mouse
 * still matches (pointer: coarse), so the touch module's replacements for the
 * lasso, space and global connect tools would otherwise wait for a finger
 * after a click. A pen counts as touch, since iOS sends touch events for it
 * too.
 *
 * @param {EventTarget} [target] where presses are listened to, the document by default
 *
 * @return {{ isMouse: function(): boolean, destroy: function() }}
 */
function createInputTracker(target) {
  target = target || document;

  var lastIsMouse = false;

  function onPointerDown(event) {
    lastIsMouse = event.pointerType === 'mouse';
  }

  target.addEventListener('pointerdown', onPointerDown, true);

  return {

    /** Whether the last press came from a mouse or a trackpad. */
    isMouse: function() {
      return lastIsMouse;
    },

    destroy: function() {
      target.removeEventListener('pointerdown', onPointerDown, true);
    }
  };
}

module.exports.createInputTracker = createInputTracker;
