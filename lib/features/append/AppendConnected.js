'use strict';

var DISTANCE = 100,
    STEP = 100,
    MAX_TRIES = 6;


/**
 * Appends plan items connected to a source plan item; see AppendConnectedHandler.
 */
function AppendConnected(commandStack, elementFactory, elementRegistry) {
  this._commandStack = commandStack;
  this._elementFactory = elementFactory;
  this._elementRegistry = elementRegistry;

  commandStack.registerHandler('cmmn.append-connected', require('./AppendConnectedHandler'));
}

AppendConnected.$inject = [ 'commandStack', 'elementFactory', 'elementRegistry' ];

module.exports = AppendConnected;


/**
 * Append a plan item of the given definition type to the source.
 *
 * @param {djs.model.Shape} source a plan item
 * @param {string} type such as cmmn:HumanTask or cmmn:Milestone
 *
 * @return {Object} { shape, criterion, connection }
 */
AppendConnected.prototype.append = function(source, type) {

  var shape = this._elementFactory.createPlanItemShape(type);

  var context = {
    source: source,
    shape: shape,
    parent: source.parent,
    position: this._findPosition(source, shape)
  };

  this._commandStack.execute('cmmn.append-connected', context);

  return context;
};

/**
 * The center of the new shape: to the right of the source, and lower down
 * while that place is taken by another shape of the same parent.
 */
AppendConnected.prototype._findPosition = function(source, shape) {

  var siblings = this._elementRegistry.filter(function(element) {
    return element.parent === source.parent && !element.waypoints && !element.labelTarget && element !== source;
  });

  var x = source.x + source.width + DISTANCE + shape.width / 2,
      y = source.y + source.height / 2;

  function isFree(cx, cy) {
    var left = cx - shape.width / 2,
        top = cy - shape.height / 2;

    return !siblings.some(function(other) {
      return left < other.x + other.width && left + shape.width > other.x &&
             top < other.y + other.height && top + shape.height > other.y;
    });
  }

  for (var i = 0; i < MAX_TRIES && !isFree(x, y); i++) {
    y += STEP;
  }

  return { x: x, y: y };
};
