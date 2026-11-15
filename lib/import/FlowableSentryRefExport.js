'use strict';

var toFlowableSentryRefs = require('../util/FlowableSentryRefUtil').toFlowableSentryRefs;


/**
 * Writes the sentry of criteria read with flowable:sentryRef as
 * flowable:sentryRef again on save (see FlowableSentryRefUtil).
 *
 * The criteria are switched when saving starts and switched back once the
 * XML is serialized, so the diagram keeps working with sentryRef.
 *
 * @param {EventBus} eventBus
 */
function FlowableSentryRefExport(eventBus) {

  var restore;

  eventBus.on('saveXML.start', function(event) {
    restore = toFlowableSentryRefs(event.definitions);
  });

  eventBus.on('saveXML.serialized', function() {
    if (restore) {
      restore();
      restore = null;
    }
  });
}

FlowableSentryRefExport.$inject = [ 'eventBus' ];

module.exports = FlowableSentryRefExport;
