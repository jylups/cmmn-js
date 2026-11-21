'use strict';

/**
 * Touch editing for the modeler, as an optional module:
 *
 *   var Modeler = require('@jylups/cmmn-js/lib/Modeler');
 *   var touchModule = require('@jylups/cmmn-js/lib/features/touch');
 *
 *   new Modeler({ additionalModules: [ touchModule ] });
 *
 * It turns itself on only where (pointer: coarse) matches, so a desktop with
 * a mouse is unchanged. assets/cmmn-js-touch.css makes the touch targets
 * larger.
 *
 * The gestures come from bpmn-js-touch-interaction (MIT, see LICENSE in this
 * folder); the other services fix what cmmn-js needs on top of them.
 */

var TouchInteraction = require('./TouchInteraction');

module.exports = {
  __depends__: [
    TouchInteraction.InteractionEventsModule
  ],
  __init__: [
    'touchInteraction',
    'touchFix',
    'touchLabelEditing',
    'touchContextPad'
  ],
  touchInteraction: [ 'type', TouchInteraction.TouchInteraction ],
  touchFix: [ 'type', TouchInteraction.TouchFix ],
  touchLabelEditing: [ 'type', require('./TouchLabelEditing') ],
  touchContextPad: [ 'type', require('./TouchContextPad') ]
};
