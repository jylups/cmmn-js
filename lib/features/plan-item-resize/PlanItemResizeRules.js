'use strict';

var inherits = require('inherits');

var RuleProvider = require('diagram-js/lib/features/rules/RuleProvider').default;

/**
 * Before cmmn-js's rules (priority 1000), which resize stages only.
 */
var PRIORITY = 1500;

/**
 * The smallest a resized task or milestone gets, in diagram units.
 */
var MIN_SIZE = {
  task: { width: 60, height: 40 },
  milestone: { width: 60, height: 24 }
};


/**
 * What a plan item's definition is, for resizing: a task, a milestone, or
 * neither.
 *
 * @param {djs.model.Base} shape
 *
 * @return {String|null} 'task', 'milestone' or null
 */
function resizeKind(shape) {
  var definition = shape && !shape.labelTarget && shape.businessObject && shape.businessObject.definitionRef;

  if (!definition || typeof definition.$instanceOf !== 'function') {
    return null;
  }

  if (definition.$instanceOf('cmmn:Task')) {
    return 'task';
  }

  return definition.$instanceOf('cmmn:Milestone') ? 'milestone' : null;
}

/**
 * Whether a shape can be resized to new bounds: tasks and milestones down to
 * their smallest size; undefined for everything else, which cmmn-js decides.
 *
 * @param {djs.model.Base} shape
 * @param {Object} [newBounds]
 *
 * @return {Boolean|undefined}
 */
function canResize(shape, newBounds) {
  var kind = resizeKind(shape);

  if (!kind) {
    return undefined;
  }

  var min = MIN_SIZE[kind];

  return !newBounds || (newBounds.width >= min.width && newBounds.height >= min.height);
}


/**
 * Tasks and milestones resizable from the handles at their corners, as stages
 * are.
 */
function PlanItemResizeRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(PlanItemResizeRules, RuleProvider);

PlanItemResizeRules.$inject = [ 'eventBus' ];

PlanItemResizeRules.prototype.init = function() {
  this.addRule('shape.resize', PRIORITY, function(context) {
    return canResize(context.shape, context.newBounds);
  });
};

module.exports = PlanItemResizeRules;

module.exports.MIN_SIZE = MIN_SIZE;
module.exports.resizeKind = resizeKind;
module.exports.canResize = canResize;
