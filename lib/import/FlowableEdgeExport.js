'use strict';

var toFlowableForm = require('../util/FlowableEdgeUtil').toFlowableForm;


/**
 * Writes the edges of sentry connectors in Flowable's form on save, except
 * for edges read in the CMMN form (see FlowableEdgeUtil).
 *
 * The edges are switched to Flowable's form when saving starts and switched
 * back once the XML is serialized, so the diagram keeps working with the
 * CMMN form.
 *
 * @param {EventBus} eventBus
 */
function FlowableEdgeExport(eventBus) {

  var restore;

  eventBus.on('saveXML.start', function(event) {
    restore = toFlowableForm(event.definitions);
  });

  eventBus.on('saveXML.serialized', function() {
    if (restore) {
      restore();
      restore = null;
    }
  });
}

FlowableEdgeExport.$inject = [ 'eventBus' ];

module.exports = FlowableEdgeExport;
