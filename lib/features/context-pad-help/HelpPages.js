'use strict';

/**
 * Flowable's reference pages for the elements of a case model.
 */
var REFERENCE = 'https://documentation.flowable.com/latest/model/cmmn/reference/';

/**
 * The Case Editor guide, for a type without a page of its own.
 */
var EDITOR_GUIDE = 'https://documentation.flowable.com/latest/user/design/cmmn-editor';

/**
 * Reference pages by CMMN type.
 */
var PAGES = {
  'cmmn:HumanTask': 'human-task',
  'cmmn:ProcessTask': 'process-task',
  'cmmn:CaseTask': 'case-task',
  'cmmn:DecisionTask': 'decision-task',
  'cmmn:Stage': 'stage',
  'cmmn:PlanFragment': 'plan-fragment',
  'cmmn:Milestone': 'milestone',
  'cmmn:TimerEventListener': 'timer-event-listener',
  'cmmn:UserEventListener': 'user-event-listener',
  'cmmn:EventListener': 'event-listener',
  'cmmn:EntryCriterion': 'entry-criterion',
  'cmmn:ExitCriterion': 'exit-criterion',
  'cmmn:TextAnnotation': 'text-annotation'
};

/**
 * Flowable's kinds of cmmn:Task, by flowable:type.
 */
var TASK_PAGES = {
  java: 'service-task',
  script: 'script-task',
  http: 'http-task',
  mail: 'email-task',
  casePage: 'case-page',
  'external-worker': 'external-worker-task'
};

/**
 * Flowable's kinds of event listener, by flowable:eventType.
 */
var LISTENER_PAGES = {
  signal: 'signal-event-listener',
  variable: 'variable-event-listener'
};


function attribute(element, name) {
  var value = element.get ? element.get(name) : undefined;

  return value === undefined || value === null ? '' : String(value);
}

/**
 * The page that explains a case model's element, or null for a label, a
 * connection or an element of another kind of model.
 *
 * @param {djs.model.Base} element
 *
 * @return {String|null}
 */
function helpUrl(element) {
  var bo = element && element.businessObject;

  if (!bo || element.labelTarget || element.waypoints) {
    return null;
  }

  var type = bo.$type || '';

  if (type.indexOf('cmmn:') !== 0) {
    return null;
  }

  // the case plan model is a stage directly in the case
  if (type === 'cmmn:Stage' && bo.$parent && bo.$parent.$type === 'cmmn:Case') {
    return REFERENCE + 'case-plan-model';
  }

  var definition = bo.definitionRef || bo,
      definitionType = definition.$type || '',
      page;

  if (definitionType === 'cmmn:Task') {
    page = TASK_PAGES[attribute(definition, 'flowable:type')];

    return page ? REFERENCE + page : EDITOR_GUIDE;
  }

  if (definitionType === 'cmmn:EventListener') {
    page = LISTENER_PAGES[attribute(definition, 'flowable:eventType')];

    return REFERENCE + (page || PAGES[definitionType]);
  }

  return PAGES[definitionType] ? REFERENCE + PAGES[definitionType] : EDITOR_GUIDE;
}

module.exports.helpUrl = helpUrl;
module.exports.REFERENCE = REFERENCE;
module.exports.EDITOR_GUIDE = EDITOR_GUIDE;
