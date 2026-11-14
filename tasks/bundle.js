'use strict';

var fs = require('fs'),
    path = require('path');

var rollup = require('rollup'),
    babel = require('@rollup/plugin-babel').babel,
    commonjs = require('@rollup/plugin-commonjs'),
    json = require('@rollup/plugin-json'),
    nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve,
    replace = require('@rollup/plugin-replace'),
    terser = require('@rollup/plugin-terser');

var pkg = require('../package');

var asyncSeries = require('./helpers').asyncSeries;

var BANNER = fs.readFileSync(__dirname + '/../resources/banner.txt', 'utf8'),
    BANNER_MIN = fs.readFileSync(__dirname + '/../resources/banner-min.txt', 'utf8');


module.exports = function bundleAll(dest, targets, done) {

  var fns = Object.keys(targets).map(function(k) {

    var variant = k;
    var entry = targets[k];

    return function(done) {
      console.log('\nbundle ' + variant);

      bundle(dest, variant, entry, done);
    };
  });

  asyncSeries(fns, done);
};



function Timer() {
  this.reset();
}

Timer.prototype.done = function(message) {
  console.log(message, '[' + (this.now() - this.s) + 'ms]');
  this.reset();
};

Timer.prototype.reset = function() {
  this.s = this.now();
};

Timer.prototype.start = function(msg) {
  this.reset();
};

Timer.prototype.now = function() {
  return new Date().getTime();
};

function processTemplate(str, args) {
  return str.replace(/\{\{\s*([^\s]+)\s*\}\}/g, function(_, n) {

    var replacement = args[n];

    if (!replacement) {
      throw new Error('unknown template {{ ' + n + '}}');
    }

    return replacement;
  });
}

function pad(n) {
  if (n < 10) {
    return '0' + n;
  } else {
    return n;
  }
}

function today() {
  var d = new Date();

  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate())
  ].join('-');
}

/**
 * Rollup plugins for one bundle.
 *
 * lib/ is written as CommonJS and requires the ES modules of diagram-js and
 * other dependencies; @rollup/plugin-commonjs converts it. Babel then
 * transpiles the whole bundle, dependencies included, with the default
 * targets of @babel/preset-env, so the bundles stay ES5.
 *
 * @param {string} nodeEnv
 *
 * @return {Array<Object>}
 */
function plugins(nodeEnv) {
  return [
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(nodeEnv)
      }
    }),
    nodeResolve({
      browser: true
    }),
    commonjs(),
    json(),
    babel({
      babelrc: false,
      configFile: false,
      babelHelpers: 'bundled',
      sourceType: 'unambiguous',
      extensions: [ '.js', '.mjs', '.cjs' ],
      presets: [
        [ '@babel/preset-env', { modules: false } ]
      ]
    })
  ];
}

function onwarn(warning, warn) {

  // diagram-js and its dependencies use `this` at the top level of
  // ES modules in a few places; Rollup rewrites it to `undefined`
  if (warning.code === 'THIS_IS_UNDEFINED') {
    return;
  }

  warn(warning);
}

function build(src, nodeEnv, output) {
  return rollup.rollup({
    input: src,
    plugins: plugins(nodeEnv),
    onwarn: onwarn
  }).then(function(result) {
    return result.write(output).then(function() {
      return result.close();
    });
  });
}

function bundle(dest, variant, entry, done) {

  var src = path.resolve(entry);

  var config = {
    variant: variant,
    version: pkg.version,
    date: today()
  };

  var targetFileBase = path.join(dest, variant);

  var banner = processTemplate(BANNER, config),
      bannerMin = processTemplate(BANNER_MIN, config);

  var timer = new Timer();

  function write(nodeEnv, output) {
    return function(done) {
      timer.start('build ' + nodeEnv);

      build(src, nodeEnv, output).then(function() {
        timer.done('wrote ' + output.file);

        done();
      }, done);
    };
  }

  var fns = [

    // production
    write('production', {
      file: targetFileBase + '.production.min.js',
      format: 'umd',
      name: 'CmmnJS',
      exports: 'default',
      plugins: [
        terser({
          compress: true,
          mangle: true,
          format: {
            comments: false,
            preamble: bannerMin
          }
        })
      ]
    }),

    // development
    write('development', {
      file: targetFileBase + '.development.js',
      format: 'umd',
      name: 'CmmnJS',
      exports: 'default',
      banner: banner.replace(/\s+$/, '')
    })
  ];

  asyncSeries(fns, done);
}
