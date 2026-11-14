/**
 */

'use strict';

var domify = require('min-dom').domify;

var domDelegate = require('min-dom').delegate;


// inlined ../../resources/logo.svg
var BPMNIO_LOGO_SVG = '';

var BPMNIO_IMG = BPMNIO_LOGO_SVG;

function css(attrs) {
  return attrs.join(';');
}

var LINK_STYLES = css([
  'color: #404040'
]);

var LIGHTBOX_STYLES = css([
  'z-index: 1001',
  'position: fixed',
  'top: 0',
  'left: 0',
  'right: 0',
  'bottom: 0'
]);

var BACKDROP_STYLES = css([
  'width: 100%',
  'height: 100%',
  'background: rgba(40,40,40,0.2)'
]);

var NOTICE_STYLES = css([
  'position: absolute',
  'left: 50%',
  'top: 40%',
  'transform: translate(-50%)',
  'width: 260px',
  'padding: 10px',
  'background: white',
  'box-shadow: 0 1px 4px rgba(0,0,0,0.3)',
  'font-family: Helvetica, Arial, sans-serif',
  'font-size: 14px',
  'display: flex',
  'line-height: 1.3'
]);

var LIGHTBOX_MARKUP =
  '<div class="bjs-powered-by-lightbox" style="' + LIGHTBOX_STYLES + '">' +
    '<div class="backdrop" style="' + BACKDROP_STYLES + '"></div>' +
    '<div class="notice" style="' + NOTICE_STYLES + '">' +
      '<a href="https://bpmn.io" target="_blank" rel="noopener" style="margin: 15px 20px 15px 10px; align-self: center;' + LINK_STYLES + '">' +
        BPMNIO_IMG +
      '</a>' +
      '<span>' +
        'Web-based tooling for BPMN, DMN and CMMN diagrams ' +
        'powered by <a href="https://bpmn.io" target="_blank" rel="noopener">bpmn.io</a>.' +
      '</span>' +
    '</div>' +
  '</div>';


var lightbox;

function open() {

  if (!lightbox) {
    lightbox = domify(LIGHTBOX_MARKUP);

    domDelegate.bind(lightbox, '.backdrop', 'click', function(event) {
      document.body.removeChild(lightbox);
    });
  }

  document.body.appendChild(lightbox);
}

module.exports.open = open;

module.exports.BPMNIO_IMG = BPMNIO_IMG;

module.exports.LINK_STYLES = LINK_STYLES;