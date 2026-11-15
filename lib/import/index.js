module.exports = {
  __init__: [ 'flowableEdgeExport', 'flowableSentryRefExport', 'generatedDiagramExport' ],
  cmmnImporter: [ 'type', require('./CmmnImporter') ],
  flowableEdgeExport: [ 'type', require('./FlowableEdgeExport') ],
  flowableSentryRefExport: [ 'type', require('./FlowableSentryRefExport') ],
  generatedDiagramExport: [ 'type', require('./GeneratedDiagramExport') ]
};
