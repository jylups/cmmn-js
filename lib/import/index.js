module.exports = {
  __init__: [ 'flowableEdgeExport', 'flowableSentryRefExport' ],
  cmmnImporter: [ 'type', require('./CmmnImporter') ],
  flowableEdgeExport: [ 'type', require('./FlowableEdgeExport') ],
  flowableSentryRefExport: [ 'type', require('./FlowableSentryRefExport') ]
};
