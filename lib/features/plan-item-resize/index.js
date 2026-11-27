'use strict';

/**
 * Tasks and milestones resizable from their corners, as stages are, as an
 * optional module:
 *
 *   var planItemResizeModule = require('@jylups/cmmn-js/lib/features/plan-item-resize');
 *
 *   new Modeler({ additionalModules: [ planItemResizeModule ] });
 *
 * assets/cmmn-js-flowable-tools.css draws the corner handles round, as in
 * Flowable Design.
 */
module.exports = {
  __init__: [ 'planItemResizeRules' ],
  planItemResizeRules: [ 'type', require('./PlanItemResizeRules') ]
};
