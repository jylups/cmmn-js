'use strict';

module.exports = {
  __depends__: [
    require('diagram-js/lib/features/outline').default
  ],
  __init__: [ 'cmmnOutlineProvider' ],
  cmmnOutlineProvider: [ 'type', require('./OutlineProvider') ]
};
