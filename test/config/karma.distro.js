'use strict';

/* global process */

// configures browsers to run test against
// any of [ 'ChromeHeadless', 'Chrome', 'Firefox' ]
//
// Chrome is the installed Google Chrome (or Chromium) that karma-chrome-launcher
// finds on the system; set CHROME_BIN to use a different binary.
var browsers =
  (process.env.TEST_BROWSERS || 'ChromeHeadless')
    .replace(/^\s+|\s+$/, '')
    .split(/\s*,\s*/g)
    .map(function(browser) {

      // run without sandbox on Linux (CI containers)
      if (browser === 'ChromeHeadless' && process.platform === 'linux') {
        return 'ChromeHeadless_Linux';
      }

      return browser;
    });


var VARIANT = process.env.VARIANT;

var NODE_ENV = process.env.NODE_ENV;

module.exports = function(karma) {
  karma.set({

    basePath: '../../',

    frameworks: [
      'mocha',
      'sinon-chai'
    ],

    files: [
      'dist/' + VARIANT + '.' + (NODE_ENV === 'production' ? 'production.min' : 'development') + '.js',
      'dist/assets/cmmn-font/css/cmmn.css',
      'dist/assets/diagram-js.css',
      { pattern: 'resources/initial.cmmn', included: false },
      { pattern: 'dist/assets/**/*', included: false },
      'test/distro/helper.js',
      'test/distro/' + VARIANT + '.js'
    ],

    reporters: [ 'spec' ],

    customLaunchers: {
      ChromeHeadless_Linux: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        debug: true
      }
    },

    browsers: browsers,

    browserNoActivityTimeout: 30000,

    singleRun: true,
    autoWatch: false
  });

};
