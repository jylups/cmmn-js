'use strict';

module.exports = {
  __depends__: [
    require('diagram-js/lib/features/copy-paste').default,
    require('../modeling'),
    require('../rules')
  ],
  __init__: [ 'cmmnCopyPaste' ],
  cmmnCopyPaste: [ 'type', require('./CmmnCopyPaste') ]
};
