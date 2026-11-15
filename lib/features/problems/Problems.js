/* global Map */

'use strict';

var domify = require('min-dom').domify,
    domEvent = require('min-dom').event;

var forEach = require('lodash/forEach'),
    filter = require('lodash/filter'),
    some = require('lodash/some');


/**
 * Attributes the editor knows how to handle although the model package
 * does not declare them, for example the `flowable:sentryRef` of a
 * criterion; they are no problem.
 */
var DEFAULT_IGNORED_ATTRIBUTES = [ 'flowable:sentryRef' ];

var MARKER = 'cjs-has-problem';

var OVERLAY_TYPE = 'problems';

var HIGH_PRIORITY = 2000;

/**
 * Readable names of reference properties.
 */
var REFERENCE_NAMES = {
  sentryRef: 'sentry',
  sourceRef: 'source',
  definitionRef: 'definition',
  cmmnElementRef: 'model element',
  sourceCMMNElementRef: 'source',
  targetCMMNElementRef: 'target',
  contextRef: 'case file item',
  caseRef: 'case',
  processRef: 'process',
  decisionRef: 'decision',
  bindingRef: 'case file item'
};

/**
 * Readable names of diagram interchange types.
 */
var DI_NAMES = {
  'cmmndi:CMMNShape': 'Diagram shape',
  'cmmndi:CMMNEdge': 'Diagram connection',
  'cmmndi:CMMNDiagram': 'Diagram'
};


/**
 * The problems of the opened model, in plain language: what is lost when
 * the model is saved or not shown, and what is kept but not recognised.
 *
 * The problems are built from the warnings of the import (`import.done`),
 * shown on the canvas with a marker and an overlay, and offered to the
 * application that hosts the editor:
 *
 *   var problems = modeler.get('problems');
 *
 *   problems.getProblems();         // all problems, the ones that lose something first
 *   problems.getProblems(element);  // the problems of a diagram element
 *   problems.getRemovedOnSave();    // what saving removes, to ask before saving
 *
 *   eventBus.on('problems.changed', function(event) { ... event.problems ... });
 *
 * A problem is
 *
 *   {
 *     id: String,
 *     kind: 'unresolved-reference' | 'unparsable-content' | 'not-drawn' | 'no-diagram' | 'unknown-attribute',
 *     severity: 'error' | 'info',
 *     removedOnSave: Boolean,
 *     message: String,
 *     element: djs.model.Base|null,         the diagram element it concerns, if shown
 *     businessObject: ModdleElement|null,   the model element it concerns
 *     warning: Object                       the import warning
 *   }
 *
 * `severity` is 'error' for what is lost on save or not shown, and 'info'
 * for what is kept but not recognised.
 *
 * Configure attributes that are no problem with
 * `{ problems: { ignoredAttributes: [ 'flowable:sentryRef' ] } }`.
 *
 * @param {Object} config
 * @param {EventBus} eventBus
 * @param {ElementRegistry} elementRegistry
 * @param {Canvas} canvas
 * @param {Overlays} overlays
 * @param {Injector} injector
 */
function Problems(config, eventBus, elementRegistry, canvas, overlays, injector) {

  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this._canvas = canvas;
  this._overlays = overlays;
  this._selection = injector.get('selection', false);
  this._translate = injector.get('translate', false) || defaultTranslate;

  this._ignoredAttributes = (config && config.ignoredAttributes) || DEFAULT_IGNORED_ATTRIBUTES;

  this._problems = [];

  var self = this;

  eventBus.on('import.done', function(event) {
    self._setProblems(self._createProblems(event.warnings || []));
  });

  eventBus.on('diagram.clear', function() {
    self._problems = [];
  });

  // a reference that is set or an element that is removed is no problem
  // anymore; checked before others, such as the properties panel, show
  // the changed elements
  eventBus.on('elements.changed', HIGH_PRIORITY, function() {
    self._updateResolved();
  });
}

Problems.$inject = [
  'config.problems',
  'eventBus',
  'elementRegistry',
  'canvas',
  'overlays',
  'injector'
];

module.exports = Problems;


/**
 * The problems of the model, or of a diagram element; the ones that lose
 * something or are not shown first.
 *
 * @param {djs.model.Base} [element]
 *
 * @return {Array<Object>}
 */
Problems.prototype.getProblems = function(element) {

  if (!element) {
    return this._problems.slice();
  }

  return filter(this._problems, function(problem) {
    return problem.element === element;
  });
};

/**
 * The problems that saving the model removes from it.
 *
 * @return {Array<Object>}
 */
Problems.prototype.getRemovedOnSave = function() {
  return filter(this._problems, function(problem) {
    return problem.removedOnSave;
  });
};


Problems.prototype._setProblems = function(problems) {

  var self = this;

  // errors first
  this._problems = filter(problems, isError).concat(filter(problems, function(problem) {
    return !isError(problem);
  }));

  this._showMarkers();

  this._eventBus.fire('problems.changed', { problems: self.getProblems() });
};

Problems.prototype._updateResolved = function() {

  var problems = this._problems,
      unresolved = filter(problems, function(problem) {
        return !isResolved(problem);
      });

  if (unresolved.length !== problems.length) {
    this._setProblems(unresolved);
  }
};


// markers //////////////////////////////////////////////////////////////


Problems.prototype._showMarkers = function() {

  var canvas = this._canvas,
      overlays = this._overlays,
      selection = this._selection,
      translate = this._translate,
      self = this;

  overlays.remove({ type: OVERLAY_TYPE });

  forEach(this._elementRegistry.getAll(), function(element) {
    if (canvas.hasMarker(element, MARKER)) {
      canvas.removeMarker(element, MARKER);
    }
  });

  var elements = [];

  forEach(this._problems, function(problem) {
    if (problem.element && isError(problem) && elements.indexOf(problem.element) === -1) {
      elements.push(problem.element);
    }
  });

  forEach(elements, function(element) {

    var messages = filter(self.getProblems(element), isError).map(function(problem) {
      return problem.message;
    });

    var html = domify(
      '<div class="cjs-problems-badge" style="' +
        'width: 18px; height: 18px; border-radius: 9px; background: #cc3b3b; color: #fff; ' +
        'font: bold 12px/18px sans-serif; text-align: center; cursor: pointer; ' +
        'box-shadow: 0 0 0 2px #fff;' +
      '">!</div>'
    );

    html.title = translate('Problems') + ':\n' + messages.join('\n');

    if (selection) {
      domEvent.bind(html, 'click', function() {
        selection.select(element);
      });
    }

    canvas.addMarker(element, MARKER);

    overlays.add(element, OVERLAY_TYPE, {
      position: { top: -9, right: 9 },
      html: html
    });
  });
};


// problems from warnings ///////////////////////////////////////////////


Problems.prototype._createProblems = function(warnings) {

  var self = this,
      problems = [],
      elementsByBo = this._getElementsByBusinessObject();

  forEach(warnings, function(warning) {
    var problem = self._createProblem(warning, elementsByBo);

    if (problem) {
      problem.id = 'problem_' + (problems.length + 1);
      problems.push(problem);
    }
  });

  // the drawing reports again a diagram element with an unresolved
  // reference, for example a shape without its model element
  return filter(problems, function(problem) {
    return problem.kind !== 'not-drawn' || !some(problems, function(other) {
      return other.kind === 'unresolved-reference' && other.businessObject === problem.businessObject;
    });
  });
};

Problems.prototype._createProblem = function(warning, elementsByBo) {

  var translate = this._translate,
      message = String(warning.message || warning),
      context = warning.context || {},
      bo = warning.element || context.element || null,
      match;

  function problem(kind, severity, removedOnSave, text) {
    return {
      kind: kind,
      severity: severity,
      removedOnSave: removedOnSave,
      message: text,
      element: bo ? findElement(bo, elementsByBo) : null,
      businessObject: bo,
      warning: warning
    };
  }

  // a reference to an ID that no element in the file has
  if ((match = /^unresolved reference <(.+)>$/.exec(message))) {
    return problem('unresolved-reference', 'error', true, translate(
      '{element} refers to {target} \'{id}\', which is not in this file. ' +
      'The reference is removed when the model is saved.', {
        element: elementLabel(bo),
        target: referenceName(warning.property),
        id: match[1]
      }));
  }

  // content the XML parser could not read, such as an unknown element
  if (/^unparsable content/.test(message)) {
    var tag = /^unparsable content (<[^>\s]*>?)?/.exec(message)[1],
        line = /line: (\d+)/.exec(message),
        column = /column: (\d+)/.exec(message);

    bo = null;

    return problem('unparsable-content', 'error', true, translate(
      'Part of the file could not be read{tag}{position}. It is removed when the model is saved.', {
        tag: tag ? ' (' + tag + ')' : '',
        position: line ? translate(' at line {line}, column {column}', {
          line: line[1],
          column: column ? column[1] : '?'
        }) : ''
      }));
  }

  // an attribute of a known namespace the model does not declare
  if ((match = /^unknown attribute <(.+)>$/.exec(message))) {

    if (this._ignoredAttributes.indexOf(match[1]) !== -1) {
      return null;
    }

    return problem('unknown-attribute', 'info', false, translate(
      '{element} has the attribute {name}, which the editor does not recognise. ' +
      'It is kept when the model is saved.', {
        element: elementLabel(bo),
        name: match[1]
      }));
  }

  // a model without a diagram
  if (/^no diagram to display/.test(message)) {
    return problem('no-diagram', 'error', false, translate(
      'The file has no diagram, so its elements are not shown.'));
  }

  // diagram elements the editor cannot show
  if (/^multiple DI elements defined for/.test(message)) {
    return problem('not-drawn', 'error', false, translate(
      '{element} has more than one shape in the diagram; only the first is shown.', {
        element: elementLabel(bo)
      }));
  }

  if (/^no (cmmnElement|source|target) referenced in/.test(message)) {
    return problem('not-drawn', 'error', false, translate(
      '{element} does not refer to a model element it can show, so it is not shown.', {
        element: elementLabel(bo)
      }));
  }

  return problem('not-drawn', 'error', false, translate(
    '{element} could not be shown: {message}', {
      element: bo ? elementLabel(bo) : translate('An element'),
      message: message
    }));
};

/**
 * The diagram elements by their business object, and the first plan item
 * of each definition.
 */
Problems.prototype._getElementsByBusinessObject = function() {

  var map = new Map();

  forEach(this._elementRegistry.getAll(), function(element) {
    var bo = element.businessObject;

    if (!bo || element.labelTarget) {
      return;
    }

    if (!map.has(bo)) {
      map.set(bo, element);
    }

    var definition = bo.definitionRef;

    if (definition && !map.has(definition)) {
      map.set(definition, element);
    }
  });

  return map;
};


// helpers //////////////////////////////////////////////////////////////


function isError(problem) {
  return problem.severity === 'error';
}

/**
 * Whether an unresolved reference was set since, or its element removed.
 */
function isResolved(problem) {

  if (problem.kind !== 'unresolved-reference') {
    return false;
  }

  var bo = problem.businessObject,
      property = problem.warning.property;

  if (!bo || !property) {
    return false;
  }

  if (bo.get(property)) {
    return true;
  }

  // removed from the model
  return !bo.$parent && !isRoot(bo);
}

function isDiagramInterchange(bo) {
  return /^(cmmndi|dc|di):/.test(bo.$type || '');
}

function isRoot(bo) {
  return bo.$instanceOf && bo.$instanceOf('cmmn:Definitions');
}

/**
 * The diagram element of a model element, or of the closest model element
 * it is part of. A diagram interchange element that is not shown has none.
 */
function findElement(bo, elementsByBo) {

  for (var current = bo; current; current = current.$parent) {

    if (isDiagramInterchange(current)) {
      return null;
    }

    if (elementsByBo.has(current)) {
      return elementsByBo.get(current);
    }
  }

  return null;
}

/**
 * A readable name of a model element: its type and its name or ID.
 */
function elementLabel(bo) {

  if (!bo || !bo.$type) {
    return 'An element';
  }

  var type = DI_NAMES[bo.$type] || humanize(bo.$type.split(':').pop()),
      name = bo.name || bo.id;

  return name ? type + ' \'' + name + '\'' : type;
}

function referenceName(property) {
  var name = String(property || '').split(':').pop();

  return REFERENCE_NAMES[name] || humanize(name).toLowerCase() || 'an element';
}

/**
 * 'EntryCriterion' -> 'Entry criterion'
 */
function humanize(name) {
  var words = String(name).replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');

  return words.map(function(word, i) {
    return i === 0 ? word : word.toLowerCase();
  }).join(' ');
}

function defaultTranslate(template, replacements) {
  replacements = replacements || {};

  return template.replace(/{([^}]+)}/g, function(_, key) {
    return replacements[key] !== undefined ? replacements[key] : '{' + key + '}';
  });
}
