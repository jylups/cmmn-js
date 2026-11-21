'use strict';

/**
 * Creating and connecting from the context pad and the palette by touch.
 * Nothing here changes anything for a mouse.
 *
 * - Dragging from a context pad entry: once the drag starts, the selection is
 *   cleared and the context pad closes, which removes the entry under the
 *   finger from the page. iOS keeps sending the touch to that removed element,
 *   where it no longer reaches the drag's listeners on the document, so the
 *   drag never ends. The entry is kept in the page, out of sight, until the
 *   finger lifts.
 * - Tapping an entry that creates a shape starts a create that waits for the
 *   next touch. A tap on the canvas places the shape there; a touch anywhere
 *   else (a toolbar, the palette, the context pad) cancels it, instead of
 *   dropping the shape at that point.
 */


/**
 * Keeps a touched element in the page while its touch lasts.
 *
 * @param {Document} doc
 */
function TouchTargetKeeper(doc) {
  this._doc = doc;
  this._target = null;
  this._holder = null;
}

/**
 * A touch started on this element.
 *
 * @param {Element} target
 */
TouchTargetKeeper.prototype.touchStarted = function(target) {
  var self = this;

  this.release();
  this._target = target;

  function end() {
    target.removeEventListener('touchend', end);
    target.removeEventListener('touchcancel', end);

    // after the end has reached the document's listeners
    setTimeout(function() {
      if (self._target === target) {
        self.release();
      }
    });
  }

  target.addEventListener('touchend', end);
  target.addEventListener('touchcancel', end);

  // a safety net for removals that don't close the context pad
  target.addEventListener('touchmove', function() {
    self.keep();
  }, { passive: true });
};

/**
 * Puts the touched element back in the page if it was removed.
 */
TouchTargetKeeper.prototype.keep = function() {
  var target = this._target;

  if (!target || target.isConnected) {
    return;
  }

  this._getHolder().appendChild(target);
};

/**
 * Forgets the touched element, and takes it out of the page if it was kept.
 */
TouchTargetKeeper.prototype.release = function() {
  if (this._target && this._target.parentNode === this._holder) {
    this._target.remove();
  }

  this._target = null;
};

TouchTargetKeeper.prototype._getHolder = function() {
  if (!this._holder || !this._holder.isConnected) {
    var holder = this._doc.createElement('div');

    holder.className = 'touch-target-keeper';
    holder.setAttribute('aria-hidden', 'true');

    Object.assign(holder.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '0',
      height: '0',
      overflow: 'hidden'
    });

    this._doc.body.appendChild(holder);
    this._holder = holder;
  }

  return this._holder;
};


/**
 * Whether a touch that starts while a drag waits should cancel the drag: the
 * drag was started by a tap (no touch was down) and the new touch is not on
 * the canvas. Such a drag is already active: create starts it at once.
 *
 * @param {Object|null} context the drag's context, with `isTouch`
 * @param {boolean} startedByTap
 * @param {boolean} onCanvas
 *
 * @return {boolean}
 */
function shouldCancelWaitingDrag(context, startedByTap, onCanvas) {
  return !!context && !!context.isTouch && startedByTap && !onCanvas;
}


/**
 * @param {EventBus} eventBus
 * @param {Dragging} dragging
 * @param {Canvas} canvas
 */
function TouchContextPad(eventBus, dragging, canvas) {
  var keeper = new TouchTargetKeeper(document);

  var svg = null,
      touchesDown = 0,
      startedByTap = false;

  eventBus.on('canvas.init', 1000, function(event) {
    svg = event.svg;
  });

  // capture listeners on the document, registered before the drag's own, so
  // they run first for the same touch
  function touchStarted(event) {
    touchesDown = event.touches.length;

    var target = event.target;

    // only this modeler's context pad and palette: a page may have several
    if (target.closest && target.closest('.djs-context-pad, .djs-palette') && canvas.getContainer().contains(target)) {
      keeper.touchStarted(target);
    }

    var onCanvas = !!svg && svg.contains(target);
    var cancel = shouldCancelWaitingDrag(dragging.context(), startedByTap, onCanvas);

    // only the first touch after the tap decides: it places or it cancels
    startedByTap = false;

    if (cancel) {
      dragging.cancel();
    }
  }

  function touchEnded(event) {
    touchesDown = event.touches.length;
  }

  document.addEventListener('touchstart', touchStarted, true);
  document.addEventListener('touchend', touchEnded, true);
  document.addEventListener('touchcancel', touchEnded, true);

  eventBus.on('drag.init', 1000, function(event) {

    // a drag that starts while no finger is down was started by a tap
    startedByTap = !!event.isTouch && touchesDown === 0;
  });

  eventBus.on('drag.ended', 1000, function() {
    startedByTap = false;
  });

  eventBus.on('contextPad.close', 1000, function() {
    keeper.keep();
  });

  eventBus.on('diagram.destroy', 1000, function() {
    keeper.release();

    document.removeEventListener('touchstart', touchStarted, true);
    document.removeEventListener('touchend', touchEnded, true);
    document.removeEventListener('touchcancel', touchEnded, true);
  });
}

TouchContextPad.$inject = [ 'eventBus', 'dragging', 'canvas' ];

module.exports = TouchContextPad;

module.exports.TouchTargetKeeper = TouchTargetKeeper;
module.exports.shouldCancelWaitingDrag = shouldCancelWaitingDrag;
