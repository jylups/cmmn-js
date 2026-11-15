'use strict';

var withoutEmptyGeneratedDiagrams = require('../util/GeneratedDiagramUtil').withoutEmptyGeneratedDiagrams;


/**
 * Leaves the empty diagram created on import for a model without a diagram
 * out on save, so the model saves as it was read until something is drawn
 * (see GeneratedDiagramUtil).
 *
 * @param {EventBus} eventBus
 */
function GeneratedDiagramExport(eventBus) {

  var restore;

  eventBus.on('saveXML.start', function(event) {
    restore = withoutEmptyGeneratedDiagrams(event.definitions);
  });

  eventBus.on('saveXML.serialized', function() {
    if (restore) {
      restore();
      restore = null;
    }
  });
}

GeneratedDiagramExport.$inject = [ 'eventBus' ];

module.exports = GeneratedDiagramExport;
