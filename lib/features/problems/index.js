'use strict';

module.exports = {
  __depends__: [
    require('diagram-js/lib/features/overlays').default,
    require('diagram-js/lib/features/selection').default
  ],
  __init__: [ 'problems' ],
  problems: [ 'type', require('./Problems') ]
};
