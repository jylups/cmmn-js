'use strict';

var TYPE_ICONS = require('../../draw/CmmnRenderer').TYPE_ICONS;


/**
 * An image of a line icon of the renderer, for palette and menu entries.
 */
function iconUrl(d, circle) {
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#1e293b" ' +
      'stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">' +
      (circle ? '<circle cx="8" cy="8" r="7.3"/>' : '<rect x="0.7" y="0.7" width="14.6" height="14.6" rx="2.5"/>') +
      '<path transform="translate(3.5 3.5) scale(0.5625)" d="' + d + '"/>' +
    '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

module.exports.iconUrl = iconUrl;


/**
 * What the palette offers, in the groups of Flowable Design's palette:
 * { id: { group, label, className or imageUrl, flowable, create(elementFactory) } }.
 *
 * Items marked flowable write flowable: attributes and are offered only when
 * the Flowable moddle extension is loaded.
 */
var ITEMS = {

  // tasks
  'human-task': {
    group: 'tasks', label: 'Human task', className: 'cmmn-icon-human-blocking-task',
    create: planItem('cmmn:HumanTask')
  },
  'case-task': {
    group: 'tasks', label: 'Case task', className: 'cmmn-icon-case-task',
    create: planItem('cmmn:CaseTask')
  },
  'process-task': {
    group: 'tasks', label: 'Process task', className: 'cmmn-icon-process-task',
    create: planItem('cmmn:ProcessTask')
  },
  'case-page': {
    group: 'tasks', label: 'Case page', flowable: true, imageUrl: iconUrl(TYPE_ICONS.task.casePage),
    create: typedTask('casePage')
  },
  'milestone': {
    group: 'tasks', label: 'Milestone', className: 'cmmn-icon-milestone',
    create: planItem('cmmn:Milestone')
  },
  'service-task': {
    group: 'tasks', label: 'Service task', flowable: true, imageUrl: iconUrl(TYPE_ICONS.task.java),
    create: typedTask('java')
  },
  'script-task': {
    group: 'tasks', label: 'Script task', flowable: true, imageUrl: iconUrl(TYPE_ICONS.task.script),
    create: typedTask('script')
  },
  'decision-task': {
    group: 'tasks', label: 'Decision task', className: 'cmmn-icon-decision-task',
    create: planItem('cmmn:DecisionTask')
  },
  'mail-task': {
    group: 'tasks', label: 'Email task', flowable: true, imageUrl: iconUrl(TYPE_ICONS.task.mail),
    create: typedTask('mail')
  },
  'http-task': {
    group: 'tasks', label: 'HTTP task', flowable: true, imageUrl: iconUrl(TYPE_ICONS.task.http),
    create: typedTask('http')
  },
  'send-event-task': {
    group: 'tasks', label: 'Send event task', flowable: true, imageUrl: iconUrl(TYPE_ICONS.task['send-event']),
    create: typedTask('send-event')
  },
  'external-worker-task': {
    group: 'tasks', label: 'External worker task', flowable: true,
    imageUrl: iconUrl(TYPE_ICONS.task['external-worker']),
    create: typedTask('external-worker')
  },
  'task': {
    group: 'tasks', label: 'Untyped task', className: 'cmmn-icon-task',
    create: planItem('cmmn:Task')
  },

  // containers
  'stage': {
    group: 'containers', label: 'Stage', className: 'cmmn-icon-stage-expanded',
    create: planItem('cmmn:Stage')
  },
  'plan-fragment': {
    group: 'containers', label: 'Plan fragment', className: 'cmmn-icon-plan-fragment-expanded-discretionary',
    create: function(elementFactory) {
      return elementFactory.createDiscretionaryItemShape('cmmn:PlanFragment');
    }
  },

  // sentries
  'entry-criterion': {
    group: 'sentries', label: 'Entry criterion', className: 'cmmn-icon-entry-criterion',
    create: function(elementFactory) {
      return elementFactory.createCriterionShape('cmmn:EntryCriterion');
    }
  },
  'exit-criterion': {
    group: 'sentries', label: 'Exit criterion', className: 'cmmn-icon-exit-criterion',
    create: function(elementFactory) {
      return elementFactory.createCriterionShape('cmmn:ExitCriterion');
    }
  },

  // listeners
  'timer-event-listener': {
    group: 'listeners', label: 'Timer event listener', className: 'cmmn-icon-timer-event-listener',
    create: planItem('cmmn:TimerEventListener')
  },
  'user-event-listener': {
    group: 'listeners', label: 'User event listener', className: 'cmmn-icon-user-event-listener',
    create: planItem('cmmn:UserEventListener')
  },
  'signal-event-listener': {
    group: 'listeners', label: 'Signal event listener', flowable: true,
    imageUrl: iconUrl(TYPE_ICONS.listener.signal, true),
    create: typedListener('signal')
  },
  'variable-event-listener': {
    group: 'listeners', label: 'Variable event listener', flowable: true,
    imageUrl: iconUrl(TYPE_ICONS.listener.variable, true),
    create: typedListener('variable')
  },
  'intent-event-listener': {
    group: 'listeners', label: 'Intent event listener', flowable: true,
    imageUrl: iconUrl(TYPE_ICONS.listener.intent, true),
    create: typedListener('intent')
  },
  'reactivate-event-listener': {
    group: 'listeners', label: 'Reactivate event listener', flowable: true,
    imageUrl: iconUrl(TYPE_ICONS.listener.reactivate, true),
    create: typedListener('reactivate')
  },
  'event-listener': {
    group: 'listeners', label: 'Event listener', className: 'cmmn-icon-event-listener',
    create: planItem('cmmn:EventListener')
  },

  // on its own
  'text-annotation': {
    group: 'annotation', label: 'Text annotation', className: 'cmmn-icon-text-annotation',
    create: function(elementFactory) {
      return elementFactory.createShape({ type: 'cmmn:TextAnnotation' });
    }
  }
};

module.exports.ITEMS = ITEMS;


/**
 * The groups of the palette that open a menu, with the icon of their button.
 */
module.exports.GROUPS = [
  { id: 'tasks', label: 'Tasks', className: 'cmmn-icon-human-blocking-task' },
  { id: 'containers', label: 'Containers', className: 'cmmn-icon-stage-expanded' },
  { id: 'sentries', label: 'Sentries', className: 'cmmn-icon-entry-criterion' },
  { id: 'listeners', label: 'Listeners', className: 'cmmn-icon-timer-event-listener' }
];

/**
 * The items of the Favorites row, unless configured with palette.favorites.
 */
module.exports.DEFAULT_FAVORITES = [ 'human-task', 'case-task', 'process-task', 'service-task' ];


function planItem(type) {
  return function(elementFactory) {
    return elementFactory.createPlanItemShape(type);
  };
}

function typedTask(type) {
  return function(elementFactory) {
    var shape = elementFactory.createPlanItemShape('cmmn:Task');

    shape.businessObject.definitionRef.set('flowable:type', type);

    return shape;
  };
}

function typedListener(eventType) {
  return function(elementFactory) {
    var shape = elementFactory.createPlanItemShape('cmmn:EventListener');

    shape.businessObject.definitionRef.set('flowable:eventType', eventType);

    return shape;
  };
}
