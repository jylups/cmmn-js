'use strict';

var path = require('path');

var basePath = '../../';

var absoluteBasePath = path.resolve(path.join(__dirname, basePath));

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


module.exports = function(karma) {
  karma.set({

    basePath: basePath,

    frameworks: [
      'browserify',
      'mocha',
      'sinon-chai'
    ],

    files: [
      'test/spec/**/*Spec.js'
    ],

    preprocessors: {
      'test/spec/**/*Spec.js': [ 'browserify' ]
    },

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
    autoWatch: false,

    // browserify configuration
    browserify: {
      debug: true,
      paths: [ absoluteBasePath ],
      transform: [
        [ 'babelify', {
          global: true,
          babelrc: false,
          presets: [
            'env'
          ]
        } ],
        [ 'stringify', {
          global: true,
          extensions: [
            '.cmmn',
            '.xml',
            '.css'
          ]
        } ]
      ]
    }
  });
};
