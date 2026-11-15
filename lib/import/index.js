module.exports = {
  __init__: [ 'flowableEdgeExport' ],
  cmmnImporter: [ 'type', require('./CmmnImporter') ],
  flowableEdgeExport: [ 'type', require('./FlowableEdgeExport') ]
};
