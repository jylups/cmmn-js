'use strict';

/**
 * Appends a plan item to another one, as Flowable Design's context pad does:
 * the new plan item is placed to the right of the source, gets an entry
 * criterion on its left border, and the source is connected to that
 * criterion, so the new plan item starts when the source completes or
 * occurs. One command, undone as one.
 *
 * Context: { source, shape, position, parent } -> { shape, criterion, connection }
 */
function AppendConnectedHandler(modeling, elementFactory) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
}

AppendConnectedHandler.$inject = [ 'modeling', 'elementFactory' ];

module.exports = AppendConnectedHandler;


AppendConnectedHandler.prototype.preExecute = function(context) {

  var modeling = this._modeling,
      elementFactory = this._elementFactory;

  var shape = modeling.createShape(context.shape, context.position, context.parent);

  var criterion = elementFactory.createCriterionShape('cmmn:EntryCriterion');

  criterion = modeling.createShape(criterion, {
    x: shape.x,
    y: shape.y + shape.height / 2
  }, shape, { attach: true });

  context.shape = shape;
  context.criterion = criterion;
  context.connection = modeling.connect(context.source, criterion);
};
