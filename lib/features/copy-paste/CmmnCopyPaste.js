'use strict';

var forEach = require('min-dash').forEach;

var ModelUtil = require('../../util/ModelUtil'),
    is = ModelUtil.is,
    isCasePlanModel = ModelUtil.isCasePlanModel;

var LOW_PRIORITY = 750;

// the properties never copied: identity, diagram and parent
var NEVER = [ 'id', 'di', 'label', '$parent' ];

// a plan item's criteria are shapes of their own, copied with it
var PLAN_ITEM_SKIP = NEVER.concat([ 'definitionRef', 'entryCriterion', 'exitCriterion' ]);

// a stage's content is shapes of its own, copied with it
var DEFINITION_SKIP = NEVER.concat([
  'planItems', 'planItemDefinitions', 'sentries', 'planningTable', 'exitCriterion', 'tableItems'
]);

// a sentry's on-parts come with the connections that draw them
var SENTRY_SKIP = NEVER.concat([ 'onParts' ]);


/**
 * Copy and paste of CMMN elements, on top of diagram-js's copy-paste: a
 * pasted plan item gets a new definition, a pasted criterion a new sentry, and
 * a pasted on-part connection a new on-part to the pasted source. Extension
 * elements (Flowable's listeners, mappings and the rest) are copied deep, with
 * new ids. References to elements outside the copy are dropped.
 *
 * @param {EventBus} eventBus
 * @param {CmmnFactory} cmmnFactory
 * @param {Moddle} moddle
 */
function CmmnCopyPaste(eventBus, cmmnFactory, moddle, sentryUpdater) {

  this._cmmnFactory = cmmnFactory;
  this._moddle = moddle;

  var self = this;

  // the case plan model can't be copied, only what is in it
  eventBus.on('copyPaste.canCopyElements', function(context) {
    var elements = context.elements.filter(function(element) {
      return !isCasePlanModel(element);
    });

    return elements.length ? elements : false;
  });

  eventBus.on('copyPaste.copyElement', LOW_PRIORITY, function(context) {
    var descriptor = context.descriptor,
        element = context.element,
        businessObject = element.businessObject;

    descriptor.type = element.type;
    descriptor.oldBusinessObject = businessObject;

    var di = businessObject && businessObject.di;

    if (di) {
      if (typeof di.isCollapsed === 'boolean') {
        descriptor.isCollapsed = di.isCollapsed;
      }

      if (typeof di.isPlanningTableCollapsed === 'boolean') {
        descriptor.isPlanningTableCollapsed = di.isPlanningTableCollapsed;
      }
    }
  });

  // pasted criteria come attached to their host, so their new sentries are
  // put in the host's stage here, as an attachment would
  eventBus.on('commandStack.elements.create.postExecuted', function(event) {
    var criteria = (event.context.elements || []).filter(function(element) {
      var sentry = element.host && is(element.businessObject, 'cmmn:Criterion') && element.businessObject.sentryRef;

      return sentry && !sentry.$parent;
    });

    if (criteria.length) {
      sentryUpdater.updateSentriesSemanticParent(criteria);
    }
  });

  eventBus.on('copyPaste.pasteElement', function(context) {
    var cache = context.cache,
        descriptor = context.descriptor,
        old = descriptor.oldBusinessObject;

    // a label belongs to its pasted element
    if (descriptor.labelTarget) {
      var labelTarget = cache[descriptor.labelTarget];

      descriptor.businessObject = labelTarget && labelTarget.businessObject;
      return;
    }

    if (!old) {
      return;
    }

    if (is(old, 'cmmndi:CMMNEdge')) {
      descriptor.businessObject = self._copyConnection(old, descriptor, cache);
    } else {
      descriptor.businessObject = self._copyShape(old);
    }

    delete descriptor.oldBusinessObject;
  });
}

CmmnCopyPaste.$inject = [ 'eventBus', 'cmmnFactory', 'moddle', 'sentryUpdater' ];

module.exports = CmmnCopyPaste;


/**
 * The business object of a pasted shape.
 */
CmmnCopyPaste.prototype._copyShape = function(old) {

  if (is(old, 'cmmn:PlanItem') || is(old, 'cmmn:DiscretionaryItem')) {
    var item = this.copyElement(old, PLAN_ITEM_SKIP);

    if (old.definitionRef) {
      item.definitionRef = this.copyElement(old.definitionRef, DEFINITION_SKIP);
    }

    return item;
  }

  if (is(old, 'cmmn:Criterion')) {
    var criterion = this.copyElement(old, NEVER.concat([ 'sentryRef' ]));

    criterion.sentryRef = old.sentryRef ?
      this.copyElement(old.sentryRef, SENTRY_SKIP) :
      this._cmmnFactory.createSentry();

    return criterion;
  }

  return this.copyElement(old, NEVER);
};


/**
 * The business object of a pasted connection: an edge with a new on-part or
 * association, or none for a discretionary connection.
 */
CmmnCopyPaste.prototype._copyConnection = function(oldEdge, descriptor, cache) {

  var old = oldEdge.cmmnElementRef,
      source = cache[descriptor.source],
      target = cache[descriptor.target],
      ref;

  if (is(old, 'cmmn:OnPart')) {
    ref = this.copyElement(old, NEVER.concat([ 'sourceRef', 'exitCriterionRef' ]));
    ref.sourceRef = source && source.businessObject;
  } else
  if (is(old, 'cmmn:Association')) {
    ref = this.copyElement(old, NEVER.concat([ 'sourceRef', 'targetRef' ]));
    ref.sourceRef = source && source.businessObject;
    ref.targetRef = target && target.businessObject;
  }

  return this._cmmnFactory.createDiEdge(ref, [], {});
};


/**
 * A deep copy of a model element with new ids, leaving out the given
 * properties. Contained elements are copied too; references are kept.
 *
 * @param {ModdleElement} element
 * @param {Array<string>} [skip]
 *
 * @return {ModdleElement}
 */
CmmnCopyPaste.prototype.copyElement = function(element, skip) {

  var self = this;

  skip = skip || NEVER;

  // elements of a namespace the model doesn't know keep their content as is
  if (element.$descriptor && element.$descriptor.isGeneric) {
    return this._copyGeneric(element);
  }

  var copy = this._cmmnFactory.create(element.$type);

  forEach(element.$descriptor.properties, function(property) {
    var name = property.name;

    if (skip.indexOf(name) !== -1 || property.isId) {
      return;
    }

    var value = element.get(name);

    if (value === undefined || value === null) {
      return;
    }

    if (property.isMany) {
      if (!value.length) {
        return;
      }

      copy.set(name, value.map(function(item) {
        return self._copyValue(item, property, copy);
      }));

      return;
    }

    copy.set(name, self._copyValue(value, property, copy));
  });

  // attributes of other namespaces, such as flowable:* on a CMMN element
  forEach(element.$attrs, function(value, key) {
    copy.$attrs[key] = value;
  });

  return copy;
};


CmmnCopyPaste.prototype._copyValue = function(value, property, parent) {

  if (!value || !value.$type || property.isReference) {
    return value;
  }

  var copy = this.copyElement(value, NEVER);

  copy.$parent = parent;

  return copy;
};


CmmnCopyPaste.prototype._copyGeneric = function(element) {

  var self = this;

  var copy = this._moddle.createAny(element.$type, element.$descriptor.ns.uri, {});

  forEach(element, function(value, key) {
    if (key.charAt(0) === '$' && key !== '$body' && key !== '$children') {
      return;
    }

    if (key === '$children') {
      copy.$children = value.map(function(child) {
        var childCopy = child && child.$type ? self._copyGeneric(child) : child;

        if (childCopy && childCopy.$type) {
          childCopy.$parent = copy;
        }

        return childCopy;
      });

      return;
    }

    copy[key] = value;
  });

  if (element.$attrs) {
    copy.$attrs = copy.$attrs || {};

    forEach(element.$attrs, function(value, key) {
      copy.$attrs[key] = value;
    });
  }

  return copy;
};
