/*
 * Touch gestures for diagram-js, from bpmn-js-touch-interaction 0.1.2
 * (https://github.com/krasucki/bpmn-js-touch-interaction, MIT licence, see
 * LICENSE in this folder): dist/bpmn-js-touch-interaction.esm.js as published
 * on npm. Conscia Modeler copied and adapted it for iPads and Android tablets
 * (Conscia-LLC/conscia-modeler, docs/spikes/touch.md), and it moved here in
 * jylups/cmmn-js-env#55.
 *
 * Changes here are marked with "CHANGED:":
 * - CommonJS, like the rest of cmmn-js, instead of ES modules.
 * - touch-action: none also for the cmmn-js container (.cjs-container).
 * - The source map comment is removed; the map isn't copied.
 * - The touch hover tracking updates the hover before a drag handles the
 *   touch, so taps and the last move of a drag see the right element.
 * - The replaced tool starts (lasso, space, global connect) call the
 *   originals after a mouse or trackpad press, for an iPad with a trackpad.
 * - A drag on a connection's bendpoint or segment handle moves it instead of
 *   panning the canvas.
 * - A dragged shape moves from where the finger went down, so it stays under
 *   the finger instead of lagging by the pan threshold.
 *
 * It turns itself on only where (pointer: coarse) matches.
 */
'use strict';

var InteractionEventsModule = require('diagram-js/lib/features/interaction-events').default;
var closest = require('min-dom').closest;
var create = require('tiny-svg').create,
    attr = require('tiny-svg').attr,
    append = require('tiny-svg').append;
// CHANGED: which kind of pointer was pressed last, for an iPad with a trackpad
var createInputTracker = require('./InputTracker').createInputTracker;

const STATES = {
  IDLE: 'IDLE',
  TOUCH_START: 'TOUCH_START',
  PAN: 'PAN',
  PRESS: 'PRESS',
  PINCH: 'PINCH',
};

function createGestureRecognizer(element, {
  onTap, onDoubleTap, onPanStart, onPanMove, onPanEnd,
  onPinchStart, onPinchMove, onPinchEnd, onPress,
  tapThreshold = 10, panThreshold = 10,
  doubleTapWindow = 300, pressDelay = 300,

  // CHANGED: touches on targets this refuses are left to the browser
  accept,
} = {}) {

  let state = STATES.IDLE;
  let startTouch = null; // { x, y, time, target, id }
  let pressTimer = null;
  let lastTapTime = 0;
  let lastTapCenter = null;

  // Pinch state
  let pinchStartDist = 0;

  function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function clearPress() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function getTouch(e, id) {
    for (const t of e.changedTouches) {
      if (t.identifier === id) return t;
    }
    return null;
  }

  function handleTouchStart(e) {
    const touches = e.touches;

    if (touches.length === 2 && state !== STATES.PINCH) {
      clearPress();

      // End active pan before entering pinch — prevents panActive staying true
      if (state === STATES.PAN) {
        onPanEnd?.({ originalEvent: e });
      }
      const t0 = touches[0], t1 = touches[1];
      const a = { x: t0.clientX, y: t0.clientY };
      const b = { x: t1.clientX, y: t1.clientY };
      pinchStartDist = dist(a, b);
      state = STATES.PINCH;
      const center = midpoint(a, b);
      onPinchStart?.({
        center,
        scale: 1,
        originalEvent: e,
      });
      e.preventDefault();
      return;
    }

    // Reset stuck state: if a drag system (e.g. diagram-js Dragging) consumed
    // touchend via stopPropagation in capture phase, we never received it and
    // are stuck in PAN/PRESS. A new touchstart means the previous gesture is over.
    if (touches.length === 1 && state !== STATES.IDLE && state !== STATES.PINCH) {
      clearPress();
      state = STATES.IDLE;
      startTouch = null;
    }

    if (touches.length !== 1 || state !== STATES.IDLE) return;

    const t = touches[0];

    if (accept && !accept(t.target)) return;

    startTouch = {
      x: t.clientX,
      y: t.clientY,
      time: Date.now(),
      target: t.target,
      id: t.identifier,
      event: e, // preserve touchstart — touchend has no coordinates for toPoint()
    };

    state = STATES.TOUCH_START;
    pressTimer = setTimeout(() => {
      if (state === STATES.TOUCH_START) {
        state = STATES.PRESS;
        onPress?.({
          center: { x: startTouch.x, y: startTouch.y },
          target: startTouch.target,
          originalEvent: e,
        });
      }
    }, pressDelay);

    e.preventDefault();
  }

  function handleTouchMove(e) {
    if (state === STATES.PINCH) {
      if (e.touches.length < 2) return;
      const t0 = e.touches[0], t1 = e.touches[1];
      const a = { x: t0.clientX, y: t0.clientY };
      const b = { x: t1.clientX, y: t1.clientY };
      const currentDist = dist(a, b);
      const scale = pinchStartDist > 0 ? currentDist / pinchStartDist : 1;
      const center = midpoint(a, b);
      onPinchMove?.({
        center,
        scale,
        originalEvent: e,
      });
      e.preventDefault();
      return;
    }

    if (!startTouch) return;
    const t = getTouch(e, startTouch.id);
    if (!t) return;

    const dx = t.clientX - startTouch.x;
    const dy = t.clientY - startTouch.y;
    const moved = Math.sqrt(dx * dx + dy * dy);

    if (state === STATES.TOUCH_START && moved > panThreshold) {
      clearPress();
      state = STATES.PAN;
      onPanStart?.({
        center: { x: startTouch.x, y: startTouch.y },
        target: startTouch.target,
        originalEvent: e,
        // CHANGED: the touchstart too, for drags that must start where the finger went down
        startEvent: startTouch.event,
      });
    }

    if (state === STATES.PRESS && moved > panThreshold) {
      state = STATES.PAN;
      onPanStart?.({
        center: { x: startTouch.x, y: startTouch.y },
        target: startTouch.target,
        originalEvent: e,
        // CHANGED: the touchstart too, for drags that must start where the finger went down
        startEvent: startTouch.event,
      });
    }

    if (state === STATES.PAN) {
      onPanMove?.({
        center: { x: t.clientX, y: t.clientY },
        deltaX: dx,
        deltaY: dy,
        target: startTouch.target,
        originalEvent: e,
      });
      e.preventDefault();
    }
  }

  function handleTouchEnd(e) {

    // First touchend during pinch ends the entire gesture (even if one finger remains).
    // The remaining finger's touchend will arrive with state=IDLE and no-op.
    if (state === STATES.PINCH) {
      onPinchEnd?.({ originalEvent: e });
      pinchStartDist = 0;
      state = STATES.IDLE;
      startTouch = null;
      return;
    }

    clearPress();

    if (state === STATES.TOUCH_START || state === STATES.PRESS) {
      const center = { x: startTouch.x, y: startTouch.y };
      const target = startTouch.target;

      // Use touchstart event, not touchend — touchend.touches is empty so
      // toPoint() in diagram-js can't extract coordinates, producing NaN.
      const originalEvent = startTouch.event;

      // Check for double-tap
      const now = Date.now();
      if (lastTapTime && (now - lastTapTime) < doubleTapWindow && lastTapCenter &&
          dist(center, lastTapCenter) < tapThreshold) {
        onDoubleTap?.({ center, target, originalEvent });
        lastTapTime = 0;
        lastTapCenter = null;
      } else {
        onTap?.({ center, target, originalEvent });
        lastTapTime = now;
        lastTapCenter = center;
      }
    }

    if (state === STATES.PAN) {
      onPanEnd?.({ originalEvent: e });
    }

    state = STATES.IDLE;
    startTouch = null;
  }

  function handleTouchCancel(e) {
    clearPress();
    if (state === STATES.PAN) {
      onPanEnd?.({ originalEvent: e });
    }
    if (state === STATES.PINCH) {
      onPinchEnd?.({ originalEvent: e });
    }
    state = STATES.IDLE;
    startTouch = null;
    pinchStartDist = 0;
  }

  const opts = { passive: false };
  element.addEventListener('touchstart', handleTouchStart, opts);
  element.addEventListener('touchmove', handleTouchMove, opts);
  element.addEventListener('touchend', handleTouchEnd, opts);
  element.addEventListener('touchcancel', handleTouchCancel, opts);

  return function cleanup() {
    clearPress();
    element.removeEventListener('touchstart', handleTouchStart, opts);
    element.removeEventListener('touchmove', handleTouchMove, opts);
    element.removeEventListener('touchend', handleTouchEnd, opts);
    element.removeEventListener('touchcancel', handleTouchCancel, opts);
  };
}

/**
 * Pure event-construction helpers for the touch interaction plugin.
 *
 * These wrap or synthesize DOM events to satisfy diagram-js's mouse-only
 * assumptions (`isPrimaryButton`, `isTouchEvent`, `toPoint`).
 */

/**
 * Wrap a TouchEvent so it passes diagram-js `isPrimaryButton(event)` check
 * (which reads `event.button === 0` — undefined on TouchEvent).
 *
 * Cannot use `Object.create(touchEvent)` — native DOM methods (`stopPropagation`,
 * `preventDefault`) throw "Illegal invocation" when called with a non-Event `this`.
 * Use a plain object with bound delegate methods instead.
 *
 * NOTE: lost `instanceof TouchEvent`. Only use for `interactionEvents.fire`,
 * NOT for `dragging.init` (which checks `isTouchEvent` via `instanceof`).
 */
function asPrimaryButtonEvent(touchEvent) {
  return {
    button: 0,
    target: touchEvent.target,
    clientX: touchEvent.clientX,
    clientY: touchEvent.clientY,
    preventDefault: () => touchEvent.preventDefault(),
    stopPropagation: () => touchEvent.stopPropagation(),
    stopImmediatePropagation: () => touchEvent.stopImmediatePropagation(),
  };
}

/**
 * Synthetic event for `palette.trigger` / `contextPad.trigger`. Both methods
 * expect an event with `delegateTarget` (the element with `data-action`) and
 * may call `preventDefault()` on the fallback path — provide no-op stubs.
 */
function syntheticEvent(delegateTarget, originalEvent) {
  return {
    delegateTarget,
    originalEvent,
    preventDefault() {},
    stopPropagation() {},
  };
}

/**
 * Construct a real TouchEvent that passes `isTouchEvent()` (instanceof check)
 * AND has populated `touches` so `toPoint()` can extract coordinates.
 *
 * Used to substitute for `null` events passed to `connect.start(null, ...)` —
 * without this, `Dragging.init` binds mouse handlers and touch events are lost.
 *
 * TouchEvent constructor requires REAL Touch instances (not plain objects),
 * hence the `new Touch({...})` call.
 *
 * @returns {TouchEvent|null} null if Touch/TouchEvent unavailable or construction fails
 */
function createSyntheticTouchEvent(type, target, x = 0, y = 0) {
  if (typeof TouchEvent === 'undefined' || typeof Touch === 'undefined') return null;
  try {
    const touch = new Touch({
      identifier: 0,
      target,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
    });
    return new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: [ touch ],
      changedTouches: [ touch ],
      targetTouches: [ touch ],
    });
  } catch (e) {
    console.warn('[touch] failed to construct synthetic TouchEvent:', e);
    return null;
  }
}

/**
 * Create a gesture recognizer for a "button surface" (palette or context pad).
 *
 * Both surfaces share the same touch flow:
 *   - tap → trigger('click', synthEvent) on the entry under the finger
 *   - pan/press → trigger('dragstart', synthEvent, true) on the entry
 *
 * The `onTapExtra` hook lets the caller intercept the tap before the default
 * `trigger('click')` runs (used by context pad to short-circuit the connect
 * entry into single-gesture mode).
 *
 * @param {Element} container
 * @param {{ trigger: Function }} service — palette or contextPad
 * @param {{ onTapExtra?: (button: Element, originalEvent: TouchEvent) => boolean, onTouch: () => void }} hooks
 *   - onTapExtra: return true to skip default trigger('click') (handled the tap yourself)
 *   - onTouch: called whenever any tap/pan/press fires (for mouse suppression)
 * @returns {() => void} cleanup
 */
function createButtonRecognizer(container, service, hooks = {}) {
  const { onTapExtra, onTouch } = hooks;

  return createGestureRecognizer(container, {
    onTap({ target, originalEvent }) {
      onTouch?.();
      const button = closest(target, '[data-action]', true);
      if (!button) return;
      if (onTapExtra && onTapExtra(button, originalEvent) === true) return;
      service.trigger('click', syntheticEvent(button, originalEvent));
    },

    onPanStart({ target, originalEvent }) {
      onTouch?.();
      const button = closest(target, '[data-action]', true);
      if (button) {
        service.trigger('dragstart', syntheticEvent(button, originalEvent), true);
      }
    },

    onPress({ target, originalEvent }) {
      onTouch?.();
      const button = closest(target, '[data-action]', true);
      if (button) {
        service.trigger('dragstart', syntheticEvent(button, originalEvent), true);
      }
    },
  });
}

/**
 * CHANGED: a gesture recognizer for the entries of a popup menu, such as the
 * menus of the palette's groups. The menu is inside the canvas container,
 * where the browser's compatibility clicks are suppressed, so entries need
 * the touch flow of the palette:
 *   - tap → trigger the entry's click; an entry that starts a create closes
 *     the menu, and the next tap on the canvas places the element
 *   - press, or a drag → trigger the entry's dragstart; the menu hides
 *     while the element is dragged
 *   - a drag more up or down than sideways, in a list that scrolls →
 *     scroll the list
 *
 * Touches outside the entries (the search field, the header) are left to
 * the browser.
 *
 * @param {Element} container the popup menu's container
 * @param {Object} popupMenu
 * @param {Object|false} dragging
 * @param {{ onTouch?: () => void }} hooks
 * @returns {() => void} cleanup
 */
function createPopupMenuRecognizer(container, popupMenu, dragging, hooks = {}) {
  const { onTouch } = hooks;

  let scrollList = null;
  let lastY = 0;
  let pressed = false;

  function entryOf(target) {
    return closest(target, '.entry', true);
  }

  function isCreating() {
    return !!(dragging && dragging.context());
  }

  // the touch event itself, not a synthetic one: unlike the palette, the
  // popup menu hands its event on to the entry's action, whose create needs
  // the touch's coordinates; the menu finds the entry from the event's target
  function startDrag(event) {

    // The menu stays, hidden, until the create is over: the touch that drags
    // goes on to the entry, and a removed entry would take the rest of the
    // touch with it. Starting the drag clears the selection, which closes
    // the context pad, and the canvas may scroll under the drag; either
    // would close the menu, so its auto close is off from before the start.
    const autoClose = typeof popupMenu._unbindAutoClose === 'function' &&
      typeof popupMenu._bindAutoClose === 'function';

    if (autoClose) popupMenu._unbindAutoClose();

    popupMenu.trigger(event, undefined, 'dragstart');

    if (isCreating()) {
      container.style.visibility = 'hidden';
    } else if (autoClose && popupMenu.isOpen()) {
      popupMenu._bindAutoClose();
    }
  }

  function tap({ target, originalEvent }) {
    onTouch?.();
    const entry = entryOf(target);
    if (!entry) return;

    popupMenu.trigger(originalEvent, undefined, 'click');

    if (isCreating() && popupMenu.isOpen()) {
      popupMenu.close();
    }
  }

  return createGestureRecognizer(container, {
    accept: (target) => !!entryOf(target),

    onTap: tap,

    onPress({ target, originalEvent }) {
      onTouch?.();
      const entry = entryOf(target);
      if (!entry) return;

      pressed = true;
      startDrag(originalEvent);
    },

    onPanStart({ target, center, originalEvent, startEvent }) {
      onTouch?.();
      const entry = entryOf(target);
      if (!entry) return;

      // after a press the drag has started already
      if (pressed) return;

      const touch = originalEvent.touches && originalEvent.touches[0],
            dx = touch ? touch.clientX - center.x : 0,
            dy = touch ? touch.clientY - center.y : 0;

      const list = closest(entry, '.djs-popup-results', true);

      if (Math.abs(dy) > Math.abs(dx) && list && list.scrollHeight > list.clientHeight) {
        scrollList = list;
        lastY = touch.clientY;
        return;
      }

      startDrag(startEvent || originalEvent);
    },

    onPanMove({ center }) {
      if (!scrollList) return;
      scrollList.scrollTop -= center.y - lastY;
      lastY = center.y;
    },

    onPanEnd() {
      scrollList = null;
      pressed = false;
    },

    // a quick second tap is another tap on an entry
    onDoubleTap: tap,
  });
}

/**
 * Plugin-wide constants. Hoisted from inline magic numbers for clarity.
 */

/** How long to suppress synthesized mouse events after a touch (ms). */
const MOUSE_SUPPRESSION_MS = 500;

/** Event priority for tool-end interceptors — must run before tool handlers (default 1000). */
const TOOL_EVENT_PRIORITY = 1500;

/** Pinch zoom bounds. Mirrors the old diagram-js TouchInteractionEvents module. */
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

/** Mouse events suppressed during touch (capture phase on canvas container). */
const SUPPRESSED_MOUSE_EVENTS = [
  'mousedown',
  'mouseup',
  'mouseover',
  'mouseout',
  'click',
  'dblclick',
];

/**
 * Tool end events whose `originalEvent` (touchend with empty `touches`) gets
 * passed to subsequent `dragging.init` / `activate*` calls. Patched at high
 * priority to a synthetic TouchEvent with valid coordinates from `changedTouches`.
 */
const PATCHED_TOOL_EVENTS = [
  'lasso.selection.end', // → activateLasso(event.originalEvent)
  'spaceTool.selection.end', // → activateMakeSpace(event.originalEvent)
  'spaceTool.ended', // → activateSelection(event.originalEvent) after make-space
];

/**
 * Mouse event suppression — prevents browser-synthesized mouse events
 * (click from tap, etc.) from firing during and shortly after a touch.
 *
 * Uses capture-phase listeners on the canvas container, scoped to bpmn-js.
 * Does NOT affect document-level handlers (like Dragging's), which is correct.
 *
 * @param {() => Element} getContainer — accessor for the canvas container
 *   (lazy: container may not exist when this is constructed)
 * @returns {{ start, schedule, end, destroy }}
 */
function createMouseSuppression(getContainer) {
  let suppressing = false;
  let timer = null;

  function stopEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function start() {
    if (suppressing) return;
    const container = getContainer();
    if (!container) return;
    suppressing = true;
    SUPPRESSED_MOUSE_EVENTS.forEach((type) => {
      container.addEventListener(type, stopEvent, true);
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(end, MOUSE_SUPPRESSION_MS);
  }

  function end() {
    if (!suppressing) return;
    const container = getContainer();
    if (!container) {
      suppressing = false;
      return;
    }
    suppressing = false;
    SUPPRESSED_MOUSE_EVENTS.forEach((type) => {
      container.removeEventListener(type, stopEvent, true);
    });
  }

  function destroy() {
    clearTimeout(timer);
    end();
  }

  return { start, schedule, end, destroy };
}

/**
 * Touch drag hover tracking.
 *
 * On mouse, `mouseover`/`mouseout` events fire as the cursor moves and HoverFix
 * sets `dragging.hover()` for the drag system. On touch, those events don't fire
 * (no hover concept). This module mirrors HoverFix._findTargetGfx specifically
 * for touch — it listens to `drag.move` and uses `document.elementFromPoint()`
 * to find the BPMN element under the finger, then calls `dragging.hover()/out()`.
 *
 * NOTE: HoverFix explicitly bails on non-MouseEvent — that's why we need this.
 *
 * @param {EventBus} eventBus
 * @param {Dragging} dragging
 * @param {ElementRegistry} elementRegistry
 * @param {Canvas} canvas
 * @returns {{ destroy: () => void }}
 */
function createHoverTracking(eventBus, dragging, elementRegistry, canvas) {

  // lastHover stays null until the first drag.move with a hit; comparing
  // null !== element on first move correctly fires the initial hover.
  let lastHover = null;

  // Match either '.djs-element' (specific BPMN element) or 'svg' (canvas root).
  // SVG fallback handles the empty-canvas case where elementFromPoint returns
  // the <svg> itself, which has no .djs-element class.
  function findElementAtPoint(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) return null;

    const gfx = closest(target, '.djs-element', true);
    if (gfx) {
      const element = elementRegistry.get(gfx);
      if (element) return { element, gfx };
    }

    if (closest(target, 'svg', true)) {
      const root = canvas.getRootElement();
      if (root) {
        return { element: root, gfx: elementRegistry.getGraphics(root) };
      }
    }

    return null;
  }

  function updateHover(touch) {
    const hit = findElementAtPoint(touch.clientX, touch.clientY);

    if (hit && hit.element !== lastHover) {
      if (lastHover) {
        dragging.out({ element: lastHover, gfx: elementRegistry.getGraphics(lastHover) });
      }
      lastHover = hit.element;
      dragging.hover({ element: hit.element, gfx: hit.gfx });
    } else if (!hit && lastHover) {
      dragging.out({ element: lastHover, gfx: elementRegistry.getGraphics(lastHover) });
      lastHover = null;
    }
  }

  function onDragMove(event) {
    if (!event.isTouch) return;

    const originalEvent = event.originalEvent;
    if (!originalEvent) return;

    const touch = originalEvent.touches?.[0] || originalEvent.changedTouches?.[0];
    if (!touch) return;

    updateHover(touch);
  }

  // CHANGED: update the hover from the touch itself, before Dragging handles
  // it. Dragging builds each move event from the hover it knows at that
  // moment, so a hover changed on drag.move only reached the next move: a tap
  // (a single move) was judged against the previous element and rejected, and
  // the previous element kept its drop marker. These capture listeners are
  // registered before any drag binds its own, so they run first.
  function onTouch(event) {
    const context = dragging.context();
    if (!context || !context.isTouch) return;

    const touch = event.touches?.[0];
    if (touch) updateHover(touch);
  }

  document.addEventListener('touchstart', onTouch, true);
  document.addEventListener('touchmove', onTouch, true);

  function onDragLifecycleEnd() {
    lastHover = null;
  }

  eventBus.on('drag.move', onDragMove);
  eventBus.on([ 'drag.end', 'drag.cancel', 'drag.cleanup' ], onDragLifecycleEnd);

  // EventBus listeners are released when the diagram is destroyed (eventBus is
  // garbage collected with the Modeler), so no explicit destroy is required.
  // Function provided for symmetry/future-proofing.
  return {
    destroy() {
      // CHANGED: the document listeners above are removed here
      document.removeEventListener('touchstart', onTouch, true);
      document.removeEventListener('touchmove', onTouch, true);
    },
  };
}

/**
 * Single-gesture tool mode for connect / lasso / space.
 *
 * Desktop flow is: tap palette, tap canvas, drag, release. Three steps. That
 * two-step canvas/drag pattern does not translate to touch: for connect,
 * `hover.startTarget` updates as the finger moves, so on release `startTarget`
 * is the destination, not the source. For all three tools the "tap to confirm
 * start, then drag" desktop flow becomes a wasted tap on touch.
 *
 * Fix: replace each tool's `activateSelection` / `start` with a flag-setter
 * (`setActiveTool('connect' | 'lasso' | 'space')`). A capture-phase touchstart
 * handler on the canvas SVG then dispatches the touch directly to the real
 * `*.activate*` / `connect.start` method.
 *
 * Touch flow: tap palette, touch + drag + release. Two steps, single gesture.
 *
 * The context pad's "connect" entry knows the source up front (the element the
 * pad is open for). The caller passes it via `setActiveTool('connect', source)`
 * and the dispatcher skips touch-based element discovery.
 *
 * @param {Object} services — { canvas, palette, elementRegistry, rules, connect, lassoTool, spaceTool, globalConnect }
 * @returns {{ setActiveTool, isActive, getActiveTool, attachCanvasInterceptor }}
 */
/** CHANGED: the index of the waypoint closest to a point. */
function nearestWaypoint(waypoints, point) {
  let best = 0;
  let bestDistance = Infinity;
  waypoints.forEach((waypoint, index) => {
    const distance = Math.hypot(waypoint.x - point.x, waypoint.y - point.y);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function createToolMode(services) {
  const { canvas, palette, elementRegistry, rules, connect, lassoTool, spaceTool, globalConnect, input } = services;

  let activeTool = null;
  let connectSource = null;

  // Maps internal tool name → palette entry id (sans `-tool` suffix that
  // diagram-js strips in updateToolHighlight).
  const TOOL_HIGHLIGHT = {
    connect: 'global-connect',
    lasso: 'lasso',
    space: 'space',
  };

  function setActiveTool(tool, source = null) {
    activeTool = tool;
    connectSource = source;
    if (palette && typeof palette.updateToolHighlight === 'function') {
      palette.updateToolHighlight(tool ? TOOL_HIGHLIGHT[tool] : '');
    }
    const container = canvas.getContainer();
    if (container) {
      container.classList.toggle('djs-touch-tool-active', !!tool);
    }
  }

  // Replace tool activation methods with flag-setters. The dispatcher will
  // call the real activation methods on the next canvas touch.
  // CHANGED: each one calls the original after a mouse or trackpad press

  // PATCH: globalConnect.start
  if (globalConnect && connect) {
    const origStart = globalConnect.start;
    globalConnect.start = function() {
      if (input.isMouse()) return origStart.apply(this, arguments);
      setActiveTool('connect');
    };
  }

  // PATCH: lassoTool.activateSelection
  if (lassoTool) {
    const origActivate = lassoTool.activateSelection;
    lassoTool.activateSelection = function() {
      if (input.isMouse()) return origActivate.apply(this, arguments);
      setActiveTool('lasso');
    };
  }

  // PATCH: spaceTool.activateSelection
  if (spaceTool) {
    const origActivate = spaceTool.activateSelection;
    spaceTool.activateSelection = function(event, autoActivate, reactivate) {
      if (input.isMouse()) return origActivate.apply(this, arguments);
      // CHANGED: diagram-js reactivates the tool after each make space, for a
      // mouse that leaves it with Escape. By touch it ends after one gesture,
      // as the lasso does, or every later touch on the canvas would make space.
      if (reactivate) {
        setActiveTool(null);
        return;
      }
      setActiveTool('space');
    };
  }

  /**
   * Attach a capture-phase touchstart listener on the canvas SVG to dispatch
   * to the active tool's real activation method.
   *
   * @param {SVGElement} svg
   * @returns {() => void} cleanup
   */
  function attachCanvasInterceptor(svg) {
    function handleToolModeTouch(e) {
      if (!activeTool) return;
      if (e.touches.length !== 1) return;

      if (activeTool === 'connect') {
        let element = connectSource;
        if (!element) {

          // Palette flow: discover source from touch position
          const touch = e.touches[0];
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          if (!target) return;
          const gfx = closest(target, '.djs-element', true);
          if (!gfx) return;
          element = elementRegistry.get(gfx);
          if (!element || !element.parent) return; // skip root
          if (rules && !rules.allowed('connection.start', { source: element })) return;
        }
        setActiveTool(null);
        e.preventDefault();
        e.stopPropagation();
        connect.start(e, element);
      } else if (activeTool === 'lasso') {
        setActiveTool(null);
        e.preventDefault();
        e.stopPropagation();
        lassoTool.activateLasso(e, true);
      } else if (activeTool === 'space') {
        setActiveTool(null);
        e.preventDefault();
        e.stopPropagation();
        spaceTool.activateMakeSpace(e);
      }
    }
    svg.addEventListener('touchstart', handleToolModeTouch, { passive: false, capture: true });
    return () => svg.removeEventListener('touchstart', handleToolModeTouch, { capture: true });
  }

  return {
    setActiveTool,
    isActive: () => !!activeTool,
    getActiveTool: () => activeTool,
    attachCanvasInterceptor,
  };
}

/**
 * Patch `event.originalEvent` on tool end events.
 *
 * Several diagram-js tools (LassoTool, SpaceTool) read `event.originalEvent`
 * from drag end events and pass it forward to `dragging.init` / `activate*`.
 * On touch, `event.originalEvent` is a touchend with empty `touches` →
 * `toPoint()` returns `{x: undefined, y: undefined}` → NaN propagates through
 * SVG transforms and crashes (`setTranslate` non-finite, `<rect> NaN`).
 *
 * Fix: at high priority (before tool handlers), replace `event.originalEvent`
 * with a real `TouchEvent('touchstart')` carrying the same touches from
 * `changedTouches`. The synthetic event has populated `touches`, passes
 * `isTouchEvent()`, and `target` is preserved via `Object.defineProperty`
 * (target is read-only on Event prototype).
 *
 * @param {EventBus} eventBus
 */
function installToolEventPatcher(eventBus) {
  eventBus.on(PATCHED_TOOL_EVENTS, TOOL_EVENT_PRIORITY, function(event) {
    const orig = event.originalEvent;
    if (!orig || typeof TouchEvent === 'undefined') return;
    if (!(orig instanceof TouchEvent)) return;
    if (orig.touches?.length) return; // already has populated touches

    const touches = Array.from(orig.changedTouches || []);
    if (!touches.length) return;

    const patched = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches,
      changedTouches: touches,
      targetTouches: touches,
    });
    Object.defineProperty(patched, 'target', { value: orig.target });
    event.originalEvent = patched;
  });
}

/**
 * Minimap touch support via mouse event synthesis.
 *
 * `diagram-js-minimap` uses ONLY mouse events. It binds `mousedown` on its
 * container/svg, then `mousemove`/`mouseup` on `document`. Since it doesn't
 * register any touch handlers, we synthesize mouse events from touch events
 * on the `.djs-minimap` container.
 *
 * This is the ONE place mouse synthesis is correct — minimap is a self-
 * contained mouse-only component with no touch handlers to conflict with.
 *
 * @param {Element} minimapEl — the .djs-minimap DOM element
 * @returns {() => void} cleanup function
 */
function attachMinimapTouchBridge(minimapEl) {
  function synthMouse(type, touch) {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
    });
  }

  let activeTouch = null;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    activeTouch = e.touches[0];
    e.target.dispatchEvent(synthMouse('mousedown', activeTouch));
    e.preventDefault();
  }

  function onTouchMove(e) {
    if (!activeTouch) return;
    const t = e.touches[0];
    if (t) {

      // mousemove dispatched on document — that's where minimap binds it
      document.dispatchEvent(synthMouse('mousemove', t));
    }
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (!activeTouch) return;
    const t = e.changedTouches[0];
    if (t) {
      document.dispatchEvent(synthMouse('mouseup', t));
    }
    activeTouch = null;
  }

  const opts = { passive: false };
  minimapEl.addEventListener('touchstart', onTouchStart, opts);
  minimapEl.addEventListener('touchmove', onTouchMove, opts);
  minimapEl.addEventListener('touchend', onTouchEnd, opts);
  minimapEl.addEventListener('touchcancel', onTouchEnd, opts);

  return function cleanup() {
    minimapEl.removeEventListener('touchstart', onTouchStart, opts);
    minimapEl.removeEventListener('touchmove', onTouchMove, opts);
    minimapEl.removeEventListener('touchend', onTouchEnd, opts);
    minimapEl.removeEventListener('touchcancel', onTouchEnd, opts);
  };
}

/**
 * Detect whether the current device uses touch as its primary input.
 *
 * Uses the `(pointer: coarse)` media query, which is the standard CSS-spec
 * way to detect "primary input is coarse" (touch). This correctly handles:
 *
 *   - Mobile phones / tablets → true (primary input is touch)
 *   - Desktop with mouse → false
 *   - Laptops with touchscreen + trackpad → false (primary is the trackpad,
 *     not touch — we don't want to break mouse interactions)
 *   - iPad with attached keyboard/mouse → still true (primary is the screen)
 *
 * The plugin's monkey-patches REPLACE several diagram-js methods (e.g.
 * globalConnect.start, lassoTool.activateSelection) with touch-only flag-setters.
 * Activating those on a mouse-primary device would break the mouse tool flow.
 * Returning false here causes services to early-return without patching anything.
 *
 * @returns {boolean}
 */
function isTouchPrimaryDevice() {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Main service. Wires touch gestures to diagram-js APIs by composing focused
 * modules from `recognizers/`, `patches/`, `bridges/` and `util/`.
 *
 * Search for `// PATCH:` to find every monkey-patch and the bug it fixes.
 *
 * `_touchFix` is unused at runtime but listed in $inject so diagram-js eagerly
 * instantiates the TouchFix service before this one (Safari iOS workaround).
 */
function TouchInteraction(injector, canvas, eventBus, elementRegistry, interactionEvents, _touchFix) {

  // --- Auto-detect: skip on mouse-primary devices ---
  // The plugin's monkey-patches replace tool activation methods with touch-only
  // flag-setters; activating them on desktop would break the mouse tool flow.
  // Use (pointer: coarse) media query to detect touch-primary devices.
  if (!isTouchPrimaryDevice()) return;

  // --- Required services ---
  const dragging = injector.get('dragging', false);
  const move = injector.get('move', false);

  // --- Optional services (some only present in Modeler, not Viewer) ---
  const palette = injector.get('palette', false);
  const contextPad = injector.get('contextPad', false);
  const connect = injector.get('connect', false);
  const globalConnect = injector.get('globalConnect', false);
  const lassoTool = injector.get('lassoTool', false);
  const spaceTool = injector.get('spaceTool', false);
  const rules = injector.get('rules', false);
  const resizeHandles = injector.get('resizeHandles', false);
  const resize = injector.get('resize', false);
  const popupMenu = injector.get('popupMenu', false);

  const cleanupFns = [];

  // --- Mouse suppression: prevent ghost click/mousedown after touches ---
  const suppression = createMouseSuppression(() => canvas.getContainer());

  // --- Hover tracking: HoverFix bails on non-MouseEvent → reimplement for touch ---
  if (dragging) {
    // CHANGED: destroyed with the diagram, since it now listens on the document
    const hoverTracking = createHoverTracking(eventBus, dragging, elementRegistry, canvas);
    cleanupFns.push(() => hoverTracking.destroy());
  }

  // CHANGED: removed with the diagram, since it listens on the document
  const input = createInputTracker();
  cleanupFns.push(() => input.destroy());

  // --- Tool mode: single-gesture connect/lasso/space ---
  // setActiveTool(tool, source?) — replaces tool activation methods + dispatches canvas touches
  const toolMode = createToolMode({
    canvas, palette, elementRegistry, rules,
    connect, lassoTool, spaceTool, globalConnect,
    input,
  });

  // --- Tool event patcher: fix NaN coords from touchend originalEvent ---
  installToolEventPatcher(eventBus);

  // --- PATCH: ResizeHandles.makeDraggable ---
  // Original binds touchstart but startResize() bails on isPrimaryButton (TouchEvent
  // has no .button → false). Replace with version that skips the check on touch.
  if (resizeHandles && resize) {
    resizeHandles.makeDraggable = function(element, gfx, direction) {
      function startResize(event) {
        resize.activate(event, element, direction);
      }
      gfx.addEventListener('mousedown', function(event) {
        if (event.button === 0) startResize(event);
      });
      gfx.addEventListener('touchstart', startResize, { passive: false });
    };
  }

  // --- PATCH: dragging.init injects keepSelection for resize ---
  // Without keepSelection, move(event, true) clears selection → ResizeHandles
  // removes the handle DOM mid-drag → browser fires touchcancel on the removed
  // target → drag ends immediately. With keepSelection, handles stay in DOM.
  if (dragging) {
    const origInit = dragging.init;
    dragging.init = function(event, relativeTo, prefix, options) {
      if (prefix === 'resize') {
        options = Object.assign({ keepSelection: true }, options || {});
      }
      return origInit.call(this, event, relativeTo, prefix, options);
    };
  }

  // --- PATCH: connect.start substitutes synthetic TouchEvent for null event ---
  // GlobalConnect calls connect.start(null, ...) — null event makes Dragging
  // bind mouse handlers → touch events never caught.
  // NOTE: this patches `connect`, but is only triggered when activeTool='connect'
  //   (which only `globalConnect.start` can set, see toolMode.js). The two
  //   patches are co-dependent — if globalConnect is missing the patch is dead code.
  if (connect) {
    const origConnectStart = connect.start;
    connect.start = function(event, start, connectionStart, autoActivate) {
      // CHANGED: not after a mouse or trackpad press, which needs the mouse drag
      if (!event && !input.isMouse()) {

        // 0,0 matches desktop's null event behavior (globalStart={0,0}).
        // Actual connection start position is in `connectionStart` arg, stored in data.
        const synthetic = createSyntheticTouchEvent('touchstart', canvas._svg, 0, 0);
        if (synthetic) event = synthetic;
      }
      return origConnectStart.call(this, event, start, connectionStart, autoActivate);
    };
  }

  // CHANGED: moves the segment or bendpoint handle under a touch
  const connectionSegmentMove = injector.get('connectionSegmentMove', false);
  const bendpointMove = injector.get('bendpointMove', false);

  function startConnectionHandleMove(target, connection, event) {
    const dragger = closest(target, '.djs-segment-dragger', true);
    if (dragger && connectionSegmentMove) {
      connectionSegmentMove.start(event, connection, Number(dragger.getAttribute('data-segment-idx')));
      return;
    }

    const bendpoint = closest(target, '.djs-bendpoint', true);
    if (bendpoint && bendpointMove && !bendpoint.classList.contains('floating')) {
      const matrix = bendpoint.transform.baseVal.consolidate()?.matrix;
      if (matrix) {
        const index = nearestWaypoint(connection.waypoints, { x: matrix.e, y: matrix.f });
        bendpointMove.start(event, connection, index, false);
        return;
      }
    }

    // anything else: let diagram-js decide from the position, as for a mouse
    Object.defineProperty(event, 'button', { value: 0 });
    interactionEvents.fire('element.mousedown', event, connection);
  }

  // --- Canvas gesture setup (runs once per diagram) ---
  eventBus.on('canvas.init', function(event) {
    const svg = event.svg;

    // Tool-mode capture interceptor must run BEFORE the bubble-phase canvas
    // recognizer below, so that tap-on-element-during-tool-mode is handled
    // by the tool dispatcher (which calls preventDefault + stopPropagation).
    cleanupFns.push(toolMode.attachCanvasInterceptor(svg));

    // panActive separates "canvas pan" (canvas.scroll) from "element drag"
    // (move.start). Both come from the same recognizer onPanStart callback,
    // distinguished by whether the touch target is a .djs-element with parent.
    let panActive = false;
    let lastPanX = 0;
    let lastPanY = 0;

    // pinchInitialZoom is captured at pinchStart so onPinchMove can compute
    // newZoom = initialZoom * cumulativeScale (recognizer reports cumulative).
    let pinchInitialZoom = 1;

    const cleanup = createGestureRecognizer(svg, {
      onTap({ target, originalEvent }) {
        suppression.start();
        suppression.schedule();

        // CHANGED: a tap on the canvas closes an open popup menu, as a click does
        if (popupMenu && popupMenu.isOpen() && !(dragging && dragging.context())) {
          popupMenu.close();
        }

        const gfx = closest(target, '.djs-element', true);
        const element = gfx ? elementRegistry.get(gfx) : elementRegistry.getAll().find(e => !e.parent);
        if (element) {
          interactionEvents.fire('element.click', asPrimaryButtonEvent(originalEvent), element);
        }
      },

      onDoubleTap({ target, originalEvent }) {
        suppression.start();
        suppression.schedule();
        const gfx = closest(target, '.djs-element', true);
        const element = gfx ? elementRegistry.get(gfx) : null;
        if (element) {
          interactionEvents.fire('element.dblclick', asPrimaryButtonEvent(originalEvent), element);
        }
      },

      onPanStart({ center, target, originalEvent, startEvent }) {
        suppression.start();
        const gfx = closest(target, '.djs-element', true);
        const element = gfx ? elementRegistry.get(gfx) : null;

        // CHANGED: a drag on a connection's bendpoint or segment handle moves
        // it, starting where the finger went down. diagram-js starts these
        // from element.mousedown and looks for the line within 10 units of
        // the pointer, which the larger touch handles go beyond.
        const bendpoints = closest(target, '.djs-bendpoints', true);
        const connection = bendpoints ? elementRegistry.get(bendpoints.getAttribute('data-element-id')) : null;
        if (connection && connection.waypoints) {
          startConnectionHandleMove(target, connection, startEvent || originalEvent);
          return;
        }

        if (element && element.parent && move) {

          // Drag a BPMN element — diagram-js Move handles the rest
          // CHANGED: from where the finger went down, not from where it
          // passed the pan threshold, so the shape stays under the finger
          move.start(startEvent || originalEvent, element, true);
        } else {

          // Pan the canvas viewport
          panActive = true;
          lastPanX = center.x;
          lastPanY = center.y;
        }
      },

      onPanMove({ center }) {
        if (!panActive) return;
        const dx = center.x - lastPanX;
        const dy = center.y - lastPanY;
        if (!isFinite(dx) || !isFinite(dy)) return;
        lastPanX = center.x;
        lastPanY = center.y;
        canvas.scroll({ dx, dy });
      },

      onPanEnd() {
        panActive = false;
        suppression.schedule();
      },

      onPress() {

        // Long press on element — drag starts when recognizer transitions to PAN
      },

      onPinchStart() {
        suppression.start();
        pinchInitialZoom = canvas.zoom();
      },

      onPinchMove({ center, scale }) {
        if (!isFinite(scale) || !isFinite(center.x) || !isFinite(center.y)) return;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchInitialZoom * scale));
        canvas.zoom(newZoom, center);
      },

      onPinchEnd() {
        suppression.schedule();
      },
    });

    cleanupFns.push(cleanup);

    // --- Minimap touch bridge ---
    // Wired here (vs. its own canvas.init listener) so init order is obvious.
    const minimapEl = canvas.getContainer()?.querySelector('.djs-minimap');
    if (minimapEl) {
      cleanupFns.push(attachMinimapTouchBridge(minimapEl));
    }
  });

  // --- Palette touch ---
  if (palette) {
    eventBus.on('palette.create', function(event) {
      const cleanup = createButtonRecognizer(event.container, palette, {
        onTouch: () => {
          suppression.start();
          suppression.schedule();

          // Reset any active tool — replaced activate methods will set it back
          // if this tap activates a tool (connect/lasso/space).
          toolMode.setActiveTool(null);
        },
      });
      cleanupFns.push(cleanup);
    });
  }

  // CHANGED: popup menus, such as the menus of the palette's groups
  if (popupMenu) {
    let popupCleanup = null;

    const closePopupRecognizer = () => {
      if (popupCleanup) {
        popupCleanup();
        popupCleanup = null;
      }
    };

    eventBus.on('popupMenu.open', function() {
      closePopupRecognizer();

      const container = popupMenu._current && popupMenu._current.container;
      if (!container) return;

      popupCleanup = createPopupMenuRecognizer(container, popupMenu, dragging, {
        onTouch: () => {
          suppression.start();
          suppression.schedule();
        },
      });
    });

    eventBus.on('popupMenu.close', closePopupRecognizer);

    // a menu hidden for a drag closes when the drag is over
    eventBus.on('create.cleanup', function() {
      const container = popupMenu._current && popupMenu._current.container;
      if (container && container.style.visibility === 'hidden' && popupMenu.isOpen()) {
        popupMenu.close();
      }
    });

    cleanupFns.push(closePopupRecognizer);
  }

  // --- Context pad touch ---
  // contextPad.create fires on every element select — clean up the previous recognizer
  let contextPadCleanup = null;
  let contextPadTarget = null;

  if (contextPad) {
    eventBus.on('contextPad.create', function(event) {
      if (contextPadCleanup) {
        contextPadCleanup();
        contextPadCleanup = null;
      }
      contextPadTarget = event.target || null;

      contextPadCleanup = createButtonRecognizer(event.pad, contextPad, {
        onTouch: () => {
          suppression.start();
          suppression.schedule();
        },
        onTapExtra: (button) => {

          // Short-circuit the connect entry: standard flow calls connect.start
          // immediately on tap, but the user hasn't moved their finger yet →
          // drag waits for movement → user must touch canvas again to continue.
          // Mobile: tap pad → touch + drag from element to target = single gesture.
          if (button.getAttribute('data-action') === 'connect' && contextPadTarget && connect) {
            toolMode.setActiveTool('connect', contextPadTarget);

            // Close the context pad so it doesn't obstruct the next touch
            if (typeof contextPad.close === 'function') contextPad.close();
            return true; // skip default trigger('click')
          }
          return false;
        },
      });
    });

    // Clear stale target reference when context pad is closed (defensive)
    eventBus.on([ 'contextPad.close', 'selection.changed' ], function() {

      // Don't clear immediately — selection.changed fires before contextPad.create.
      // Target will be overwritten on next contextPad.create. Only clear on close.
      if (!contextPad.isOpen?.()) {
        contextPadTarget = null;
      }
    });
  }

  // --- Cleanup on diagram destroy ---
  eventBus.on('diagram.destroy', function() {
    suppression.destroy();
    if (contextPadCleanup) contextPadCleanup();
    cleanupFns.forEach(fn => fn());
    cleanupFns.length = 0;
  });
}

TouchInteraction.$inject = [
  'injector', 'canvas', 'eventBus',
  'elementRegistry', 'interactionEvents', 'touchFix',
];

/**
 * Safari iOS workaround: touchstart does not fire on empty SVG areas.
 *
 * Adding invisible 10x10 rects at far-off coordinates extends the SVG's
 * bounding box, which makes touchstart events fire reliably anywhere
 * inside the canvas. Two opposite corners (top-right and top-left at
 * y=10000) are sufficient to span the diagonal — additional rects would
 * be redundant. Ported from the old diagram-js TouchInteractionEvents.
 *
 * `_canvas` is injected (not used at runtime) so diagram-js eagerly
 * instantiates the Canvas service before this one — guarantees `canvas.init`
 * fires after our listener is registered.
 */

function TouchFix(_canvas, eventBus) {

  // Skip on mouse-primary devices — the workaround is iOS-specific.
  if (!isTouchPrimaryDevice()) return;

  eventBus.on('canvas.init', function(event) {
    const svg = event.svg;

    function addRect(x, y) {
      const rect = create('rect');
      attr(rect, {
        x, y,
        width: 10,
        height: 10,
        fill: 'none',
        stroke: 'none',
        'pointer-events': 'all',
      });
      append(svg, rect);
    }

    addRect(-1e4, 10000);
    addRect(10000, 10000);
  });
}

TouchFix.$inject = [ 'canvas', 'eventBus' ];

function __inject(css){if(typeof document != "undefined")document.head.appendChild(document.createElement("style")).textContent=css;}

// CHANGED: .cjs-container added; the library styled only the bpmn-js container
__inject(".bjs-container,.bjs-container *,.cjs-container,.cjs-container *,.djs-palette,.djs-palette *{touch-action:none;}.djs-touch-tool-active .djs-svg{cursor:crosshair;}");

// CHANGED: the parts are exported, and index.js makes the module of them
module.exports = {
  InteractionEventsModule: InteractionEventsModule,
  TouchInteraction: TouchInteraction,
  TouchFix: TouchFix,
  nearestWaypoint: nearestWaypoint
};
