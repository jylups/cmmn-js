'use strict';

var ModelUtil = require('../../util/ModelUtil'),
    is = ModelUtil.is,
    isCasePlanModel = ModelUtil.isCasePlanModel,
    getDefinition = ModelUtil.getDefinition;

var isCollapsed = require('../../util/DiUtil').isCollapsed;


/**
 * Where a paste can go in a case model: the case plan or an expanded stage.
 *
 * @param {djs.model.Base} element
 *
 * @return {Boolean}
 */
function canPasteInto(element) {
  if (isCasePlanModel(element)) {
    return true;
  }

  return is(getDefinition(element), 'cmmn:Stage') && !isCollapsed(element);
}

/**
 * What the context pad offers in a case model: Copy and Cut on any shape but
 * the case plan, Paste on the case plan and on an expanded stage.
 *
 * A host replaces these with its own rules as the
 * `contextPadClipboardRules` service, for example for another kind of model:
 *
 *   { contextPadClipboardRules: [ 'value', { canCopy: ..., canPasteInto: ... } ] }
 */
var ClipboardRules = {
  canCopy: function(element) {
    return !isCasePlanModel(element);
  },
  canPasteInto: canPasteInto
};

module.exports = ClipboardRules;

module.exports.canPasteInto = canPasteInto;
