'use strict';

var svgAttr = require('tiny-svg').attr;

var isCasePlanModel = require('../../util/ModelUtil').isCasePlanModel;

/**
 * Distance between an element and its outline, as in the default outline of
 * diagram-js.
 */
var OUTLINE_OFFSET = 5;

/**
 * Height of the tab drawn on top of a case plan model.
 */
var CASE_PLAN_MODEL_TAB_HEIGHT = 18;


/**
 * An outline provider for CMMN elements.
 *
 * The outline of a case plan model includes the tab drawn above its bounds.
 * Other elements get the default outline of diagram-js.
 *
 * @param {Outline} outline
 */
function OutlineProvider(outline) {
  outline.registerProvider(this);
}

OutlineProvider.$inject = [ 'outline' ];

module.exports = OutlineProvider;


/**
 * Update the outline of the given element, if it differs from the default.
 *
 * @param {djs.model.Base} element
 * @param {SVGElement} outline
 *
 * @return {boolean} whether the outline was updated
 */
OutlineProvider.prototype.updateOutline = function(element, outline) {

  if (!isCasePlanModel(element)) {
    return false;
  }

  svgAttr(outline, {
    x: -OUTLINE_OFFSET,
    y: -OUTLINE_OFFSET - CASE_PLAN_MODEL_TAB_HEIGHT,
    width: element.width + OUTLINE_OFFSET * 2,
    height: element.height + CASE_PLAN_MODEL_TAB_HEIGHT + OUTLINE_OFFSET * 2
  });

  return true;
};
