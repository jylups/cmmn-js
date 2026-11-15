'use strict';

var filter = require('min-dash').filter,
    forEach = require('min-dash').forEach;

/**
 * Models without a diagram.
 *
 * CMMN 1.1 allows models without diagram interchange (DI), and Flowable's
 * engine reads them. cmmn-js shows a diagram, so on import it creates an
 * empty cmmndi:CMMNDiagram for such a model. Elements drawn on it are saved
 * with it; while it is empty, it is left out on save, so the model saves as
 * it was read.
 */

/**
 * Marks a cmmndi:CMMNDI or cmmndi:CMMNDiagram created on import.
 */
var GENERATED = '$generated';


/**
 * Whether the given definitions have a diagram.
 *
 * @param {ModdleElement} definitions cmmn:Definitions
 *
 * @return {boolean}
 */
function hasDiagram(definitions) {
  var cmmndi = definitions.CMMNDI;

  return !!(cmmndi && cmmndi.diagrams && cmmndi.diagrams.length);
}

module.exports.hasDiagram = hasDiagram;


/**
 * Create an empty diagram for definitions without one.
 *
 * @param {ModdleElement} definitions cmmn:Definitions
 *
 * @return {ModdleElement} cmmndi:CMMNDiagram
 */
function createDiagram(definitions) {

  var model = definitions.$model,
      cmmndi = definitions.CMMNDI;

  if (!cmmndi) {
    cmmndi = model.create('cmmndi:CMMNDI');
    cmmndi.$parent = definitions;
    cmmndi[GENERATED] = true;

    definitions.CMMNDI = cmmndi;
  }

  var diagram = model.create('cmmndi:CMMNDiagram');

  diagram.id = model.ids ?
    model.ids.nextPrefixed('CMMNDiagram_', diagram) :
    'CMMNDiagram_1';

  diagram.$parent = cmmndi;
  diagram[GENERATED] = true;

  cmmndi.get('diagrams').push(diagram);

  return diagram;
}

module.exports.createDiagram = createDiagram;


/**
 * Leave the diagrams created on import that are still empty out of the
 * given definitions.
 *
 * @param {ModdleElement} definitions cmmn:Definitions
 *
 * @return {Function} restores the definitions
 */
function withoutEmptyGeneratedDiagrams(definitions) {

  var cmmndi = definitions && definitions.CMMNDI;

  if (!cmmndi || !cmmndi.diagrams) {
    return function() {};
  }

  var diagrams = cmmndi.diagrams.slice();

  var empty = filter(diagrams, function(diagram) {
    return diagram[GENERATED] && !(diagram.diagramElements && diagram.diagramElements.length);
  });

  if (!empty.length) {
    return function() {};
  }

  forEach(empty, function(diagram) {
    cmmndi.diagrams.splice(cmmndi.diagrams.indexOf(diagram), 1);
  });

  var removeCmmndi = cmmndi[GENERATED] && !cmmndi.diagrams.length;

  if (removeCmmndi) {
    definitions.CMMNDI = undefined;
  }

  return function restore() {
    cmmndi.diagrams.length = 0;

    forEach(diagrams, function(diagram) {
      cmmndi.diagrams.push(diagram);
    });

    if (removeCmmndi) {
      definitions.CMMNDI = cmmndi;
    }
  };
}

module.exports.withoutEmptyGeneratedDiagrams = withoutEmptyGeneratedDiagrams;
