'use strict';

var assign = require('min-dash').assign,
    isArray = require('min-dash').isArray;

var isAny = require('../modeling/util/ModelingUtil').isAny;

var ModelUtil = require('../../util/ModelUtil'),
    is = ModelUtil.is,
    getDefinition = ModelUtil.getDefinition;

/**
 * A provider for CMMN 1.1 elements context pad
 */
function ContextPadProvider(
    contextPad,
    connect,
    create,
    elementFactory,
    modeling,
    rules,
    popupMenu,
    canvas,
    appendConnected,
    selection
) {

  contextPad.registerProvider(this);

  this._contextPad = contextPad;
  this._connect = connect;
  this._create = create;
  this._elementFactory = elementFactory;
  this._modeling = modeling;
  this._rules = rules;
  this._popupMenu = popupMenu;
  this._canvas = canvas;
  this._appendConnected = appendConnected;
  this._selection = selection;
}

ContextPadProvider.$inject = [
  'contextPad',
  'connect',
  'create',
  'elementFactory',
  'modeling',
  'rules',
  'popupMenu',
  'canvas',
  'appendConnected',
  'selection'
];

module.exports = ContextPadProvider;


ContextPadProvider.prototype.getContextPadEntries = function(element) {

  var contextPad = this._contextPad,
      connect = this._connect,
      create = this._create,
      elementFactory = this._elementFactory,
      modeling = this._modeling,
      canvas = this._canvas,
      rules = this._rules,
      popupMenu = this._popupMenu,
      appendConnected = this._appendConnected,
      selection = this._selection;

  var actions = {};

  if (element.type === 'label') {
    return actions;
  }


  function removeElement(e) {
    modeling.removeElements([ element ]);
  }

  function getReplaceMenuPosition(element) {

    var Y_OFFSET = 5;

    var diagramContainer = canvas.getContainer(),
        pad = contextPad.getPad(element).html;

    var diagramRect = diagramContainer.getBoundingClientRect(),
        padRect = pad.getBoundingClientRect();

    var top = padRect.top - diagramRect.top;
    var left = padRect.left - diagramRect.left;

    var pos = {
      x: left,
      y: top + padRect.height + Y_OFFSET
    };

    return pos;
  }

  function startConnect(event, element, autoActivate) {
    connect.start(event, element, autoActivate);
  }


  function appendCriterionAction(className, title, options) {

    function appendListener(event, element) {
      var shape = elementFactory.createCriterionShape('cmmn:EntryCriterion');
      create.start(event, shape, {
        source: element
      });
    }

    return appendAction('cmmn:EntryCriterion', className, title, options, appendListener);
  }

  function appendDiscretionaryItemAction(className, title, options) {

    function appendListener(event, element) {
      var shape = elementFactory.createDiscretionaryItemShape('cmmn:Task');
      create.start(event, shape, {
        source: element
      });
    }

    return appendAction('cmmn:DiscretionaryItem', className, title, options, appendListener);
  }

  function appendConnectedAction(type, className, title) {

    function append(event, element) {
      var context = appendConnected.append(element, type);

      selection.select(context.shape);
    }

    return {
      group: 'model',
      className: className,
      title: title,
      action: {
        click: append
      }
    };
  }

  function createExitCriterion(event) {
    create.start(event, elementFactory.createCriterionShape('cmmn:ExitCriterion'));
  }

  function appendAction(type, className, title, options, listener) {

    if (typeof title !== 'string') {
      options = title;
      title = 'Append ' + type.replace(/^cmmn:/, '');
    }

    function appendListener(event, element) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      create.start(event, shape, {
        source: element
      });
    }

    return {
      group: 'model',
      className: className,
      title: title,
      action: {
        dragstart: listener || appendListener,
        click: listener || appendListener
      }
    };
  }


  if (isAny(element, [ 'cmmn:PlanItem', 'cmmn:CaseFileItem' ])) {
    assign(actions, {
      'append.entryCriterion': appendCriterionAction('cmmn-icon-entry-criterion', 'Append Criterion')
    });
  }

  // as in Flowable Design: append a plan item that starts when this one
  // completes, connected through an entry criterion, or attach an exit criterion
  if (isAppendSource(element)) {
    assign(actions, {
      'append.human-task': appendConnectedAction(
        'cmmn:HumanTask', 'cmmn-icon-human-blocking-task', 'Append human task, started by this one'),
      'append.milestone': appendConnectedAction(
        'cmmn:Milestone', 'cmmn-icon-milestone', 'Append milestone, reached by this one'),
      'append.exitCriterion': {
        group: 'model',
        className: 'cmmn-icon-exit-criterion',
        title: 'Add exit criterion',
        action: {
          dragstart: createExitCriterion,
          click: createExitCriterion
        }
      }
    });
  }

  if (isBlockingHumanTask(element)) {
    assign(actions, {
      'append.discretionaryItem': appendDiscretionaryItemAction(
        'cmmn-icon-task-discretionary',
        'Append DiscretionaryItem'
      )
    });
  }


  if (!popupMenu.isEmpty(element, 'cmmn-replace')) {

    // Replace menu entry
    assign(actions, {
      'replace': {
        group: 'edit',
        className: 'cmmn-icon-screw-wrench',
        title: 'Change type',
        action: {
          click: function(event, element) {

            var position = assign(getReplaceMenuPosition(element), {
              cursor: { x: event.x, y: event.y }
            });

            popupMenu.open(element, 'cmmn-replace', position);
          }
        }
      }
    });
  }


  if (!isAny(element, [ 'cmmndi:CMMNEdge', 'cmmn:TextAnnotation' ])) {
    assign(actions, {
      'append.text-annotation': appendAction('cmmn:TextAnnotation', 'cmmn-icon-text-annotation')
    });
  }


  if (isAny(element, [
    'cmmn:PlanItem',
    'cmmn:DiscretionaryItem',
    'cmmn:CaseFileItem',
    'cmmn:Criterion'
  ])) {

    assign(actions, {

      'connect': {
        group: 'connect',
        className: 'cmmn-icon-connection',
        title: 'Connect using Discretionary/OnPart or Association',
        action: {
          click: startConnect,
          dragstart: startConnect
        }
      }
    });
  }


  // delete element entry, only show if allowed by rules
  var deleteAllowed = rules.allowed('elements.delete', { elements: [ element ] });

  if (isArray(deleteAllowed)) {
    // was the element returned as a deletion candidate?
    deleteAllowed = deleteAllowed[0] === element;
  }

  if (deleteAllowed) {
    assign(actions, {
      'delete': {
        group: 'edit',
        className: 'cmmn-icon-trash',
        title: 'Remove',
        action: {
          click: removeElement
        }
      }
    });
  }

  return actions;
};


/**
 * A plan item that can start another one: a task, stage, milestone or event
 * listener, not the case plan model.
 */
function isAppendSource(element) {
  var bo = element.businessObject,
      definition = bo && bo.definitionRef;

  return is(element, 'cmmn:PlanItem') && !element.labelTarget && isAny(definition, [
    'cmmn:Task', 'cmmn:Stage', 'cmmn:Milestone', 'cmmn:EventListener'
  ]);
}

function isBlockingHumanTask(element) {
  var definition = getDefinition(element);
  return is(definition, 'cmmn:HumanTask') && definition.isBlocking;
}