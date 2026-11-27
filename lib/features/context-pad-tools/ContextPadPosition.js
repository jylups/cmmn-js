'use strict';

var assign = require('min-dash').assign;

/**
 * diagram-js's gap between a shape and its context pad, in diagram units.
 */
var CONTEXT_PAD_MARGIN = 8;

/**
 * The class of a pad split around its shape, and its tools group.
 */
var SPLIT_CLASS = 'split';
var TOOLS_GROUP = '.group[data-group="edit"]';


/**
 * Where the pad goes: right of the shape when it fits, left of it otherwise.
 *
 * @param {Object} target the shape's bounds on screen ({ left, right })
 * @param {Object} container the canvas's bounds on screen
 * @param {Number} visibleRight where the visible canvas ends on screen
 * @param {Number} padWidth
 * @param {Number} margin
 *
 * @return {Number} the pad's left, in the canvas
 */
function padLeft(target, container, visibleRight, padWidth, margin) {
  var right = target.right - container.left + margin,
      end = Math.min(container.right, visibleRight) - container.left;

  if (right + padWidth <= end) {
    return right;
  }

  return Math.max(0, target.left - container.left - margin - padWidth);
}

/**
 * Where a split pad goes: its append actions right of the shape and its tools
 * left of it, or null when either side would leave the visible canvas.
 *
 * @param {Object} target
 * @param {Object} container
 * @param {Number} visibleRight
 * @param {Number} appendWidth
 * @param {Number} toolsWidth
 * @param {Number} margin
 * @param {Number} [visibleLeft] where the visible canvas starts on screen
 *
 * @return {Number|null}
 */
function splitLeft(target, container, visibleRight, appendWidth, toolsWidth, margin, visibleLeft) {
  var right = target.right - container.left + margin,
      end = Math.min(container.right, visibleRight) - container.left,
      toolsLeft = target.left - margin - toolsWidth;

  if (visibleLeft === undefined) {
    visibleLeft = container.left;
  }

  return right + appendWidth <= end && toolsLeft >= Math.max(container.left, visibleLeft) ? right : null;
}

/**
 * The pad's top: level with the shape's top, as diagram-js puts it, or higher
 * when the pad would otherwise end below the canvas, but never above it.
 *
 * @param {Number} targetTop
 * @param {Object} container ({ top, bottom })
 * @param {Number} padHeight
 *
 * @return {Number}
 */
function padTop(targetTop, container, padHeight) {
  var top = targetTop - container.top;

  return Math.max(0, Math.min(top, container.bottom - container.top - padHeight));
}

/**
 * Where the canvas is free on the left: right of the palette while it is shown.
 */
function paletteRight(container) {
  var palette = container.querySelector('.djs-palette'),
      bounds = palette && palette.getBoundingClientRect();

  // a collapsed palette (display: none) has no size
  return bounds && bounds.right > bounds.left ? bounds.right : -Infinity;
}


/**
 * Keeps the context pad on screen and splits it around the shape, as Flowable
 * Design does: the tools left of the shape and the append actions right of it.
 * When the two sides don't both fit, the whole pad goes right of the shape, or
 * left of it when it doesn't fit there either. A connection's pad stays where
 * diagram-js puts it.
 *
 * Configured with `contextPadPosition: { visibleRight }`, a function giving
 * the screen x where the visible canvas ends, for a host that covers part of
 * the canvas (a drawer, a panel), or Infinity when all of it is visible.
 */
function ContextPadPosition(contextPad, canvas, config) {
  var getPosition = contextPad._getPosition.bind(contextPad);

  contextPad._getPosition = function(target) {
    var position = getPosition(target),
        pad = contextPad._current && contextPad._current.html;

    if (!pad || !('left' in position) || (target && target.waypoints)) {
      return position;
    }

    var bounds = contextPad._getTargetBounds(target),
        container = canvas.getContainer().getBoundingClientRect(),
        visibleRight = config && config.visibleRight ? config.visibleRight() : Infinity,
        margin = CONTEXT_PAD_MARGIN * canvas.zoom();

    // measured split: the tools group is then out of the pad's flow
    var tools = pad.querySelector(TOOLS_GROUP);

    pad.classList.toggle(SPLIT_CLASS, !!tools);

    var split = tools ?
      splitLeft(bounds, container, visibleRight, pad.offsetWidth, tools.offsetWidth, margin,
        paletteRight(canvas.getContainer())) :
      null;

    if (split !== null) {

      // the tools group ends this far left of the pad: across the shape and both gaps
      pad.style.setProperty('--context-pad-span', (bounds.right - bounds.left + 2 * margin) + 'px');

      // the tools group hangs from the pad's top, out of its flow
      var height = Math.max(pad.offsetHeight, tools.offsetHeight);

      return assign({}, position, { left: split, top: padTop(bounds.top, container, height) });
    }

    pad.classList.toggle(SPLIT_CLASS, false);

    return assign({}, position, {
      left: padLeft(bounds, container, visibleRight, pad.offsetWidth, margin),
      top: padTop(bounds.top, container, pad.offsetHeight)
    });
  };
}

ContextPadPosition.$inject = [ 'contextPad', 'canvas', 'config.contextPadPosition' ];

module.exports = ContextPadPosition;

module.exports.SPLIT_CLASS = SPLIT_CLASS;
module.exports.padLeft = padLeft;
module.exports.splitLeft = splitLeft;
module.exports.padTop = padTop;
