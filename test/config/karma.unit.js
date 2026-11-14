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

    // load the plugins from this package: in the workspace, karma itself may
    // be installed next to other versions of them (for example webpack 4)
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-safari-launcher'),
      require('karma-mocha'),
      require('karma-sinon-chai'),
      require('karma-spec-reporter'),
      require('karma-webpack')
    ],

    frameworks: [
      'webpack',
      'mocha',
      'sinon-chai'
    ],

    // TestHelper publishes the globals the specs use (bootstrapModeler,
    // inject, ...); load it before them
    files: [
      'test/TestHelper.js',
      'test/spec/**/*Spec.js'
    ],

    preprocessors: {
      'test/TestHelper.js': [ 'webpack' ],
      'test/spec/**/*Spec.js': [ 'webpack' ]
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

    // webpack configuration
    //
    // lib/ and the tests are CommonJS and require the ES modules of
    // diagram-js; webpack bundles both as they are. The tests run in a
    // current browser, so they need no transpiling.
    webpack: {
      mode: 'development',
      devtool: 'eval-source-map',
      target: 'web',
      resolve: {

        // allow require('lib/...') and require('test/...')
        modules: [ 'node_modules', absoluteBasePath ]
      },
      module: {
        rules: [
          {
            test: /\.(cmmn|xml|css)$/,
            type: 'asset/source'
          }
        ]
      }
    }
  });
};
