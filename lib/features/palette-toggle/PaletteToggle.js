'use strict';

var domify = require('min-dom').domify,
    domClasses = require('min-dom').classes,
    domRemove = require('min-dom').remove;

/**
 * The gap between the button and the palette below it, in pixels.
 */
var GAP = 6;

var LABELS = {
  collapse: 'Collapse the tools',
  show: 'Show the tools'
};

var ON_CLASS = 'cjs-palette-toggle-on',
    COLLAPSED_CLASS = 'cjs-palette-collapsed';


/**
 * A button above the palette that collapses it out of sight and shows it
 * again; diagram-js's own toggle is hidden (see
 * assets/cmmn-js-flowable-tools.css).
 *
 * The button goes next to the canvas's container, not in it: there the touch
 * module would drop taps on anything but a palette entry. diagram-js opens the
 * palette again after every rebuild, so the wanted state is applied whenever
 * the palette changes.
 *
 * Configured with `paletteToggle`:
 * - `open`: whether the palette starts open (true);
 * - `onToggle(open)`: called when the button asks for the other state, for a
 *   host that keeps one state for several modelers and calls set() on each;
 *   without it, the button opens or collapses this palette;
 * - `parent`: the element the button goes in (the container's parent);
 * - `labels`: `{ collapse, show }`, the button's text for screen readers.
 *
 * Fires `paletteToggle.changed` with `{ open }`.
 */
function PaletteToggle(palette, eventBus, canvas, config) {
  var self = this;

  config = config || {};

  this._palette = palette;
  this._eventBus = eventBus;
  this._container = canvas.getContainer();
  this._labels = config.labels || LABELS;
  this._open = config.open !== false;

  var button = this.button = domify('<button type="button" class="cjs-palette-toggle"></button>');

  button.addEventListener('click', function() {
    var open = !self._open;

    if (config.onToggle) {
      config.onToggle(open);
    } else {
      self.set(open);
    }
  });

  (config.parent || this._container.parentNode || this._container).appendChild(button);

  domClasses(this._container).add(ON_CLASS);

  eventBus.on('palette.changed', function() {
    self._apply();
  });

  eventBus.on('diagram.destroy', function() {
    domRemove(button);
  });

  // the button takes room above the palette, which diagram-js doesn't know
  // about when it decides to lay the palette out in two columns
  var needsCollapse = palette._needsCollapse.bind(palette);

  palette._needsCollapse = function(availableHeight, entries) {
    return needsCollapse(availableHeight - self._barHeight(), entries);
  };

  this._update();
}

PaletteToggle.$inject = [ 'palette', 'eventBus', 'canvas', 'config.paletteToggle' ];

module.exports = PaletteToggle;


/**
 * Opens or collapses the palette.
 *
 * @param {Boolean} open
 */
PaletteToggle.prototype.set = function(open) {
  open = !!open;

  var changed = open !== this._open;

  this._open = open;
  this._update();
  this._apply();

  if (changed) {
    this._eventBus.fire('paletteToggle.changed', { open: open });
  }
};

/**
 * @return {Boolean} whether the palette is wanted open
 */
PaletteToggle.prototype.isOpen = function() {
  return this._open;
};

PaletteToggle.prototype._apply = function() {
  var palette = this._palette;

  // open and close don't work before the palette is drawn
  if (!palette._container || palette.isOpen() === this._open) {
    return;
  }

  if (this._open) {
    palette.open();
  } else {
    palette.close();
  }
};

PaletteToggle.prototype._update = function() {
  var button = this.button,
      label = this._open ? this._labels.collapse : this._labels.show;

  button.setAttribute('aria-expanded', String(this._open));
  button.setAttribute('aria-label', label);
  button.setAttribute('title', label);
  button.textContent = this._open ? '‹' : '›';

  domClasses(this._container).toggle(COLLAPSED_CLASS, !this._open);
};

PaletteToggle.prototype._barHeight = function() {
  return this.button.offsetHeight + GAP;
};
