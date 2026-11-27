'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject */

var domQueryAll = require('min-dom').queryAll;

var contextPadToolsModule = require('../../../../lib/features/context-pad-tools'),
    contextPadClipboardModule = require('../../../../lib/features/context-pad-clipboard'),
    contextPadHelpModule = require('../../../../lib/features/context-pad-help'),
    ContextPadTools = require('../../../../lib/features/context-pad-tools/ContextPadTools'),
    ContextPadPosition = require('../../../../lib/features/context-pad-tools/ContextPadPosition');

var regroupTools = ContextPadTools.regroupTools,
    padLeft = ContextPadPosition.padLeft,
    splitLeft = ContextPadPosition.splitLeft,
    padTop = ContextPadPosition.padTop;


function element(elementRegistry, id) {

  // the on part's connection
  if (id === 'connection') {
    return elementRegistry.filter(function(e) {
      return !!e.waypoints;
    })[0];
  }

  return elementRegistry.get(id);
}


describe('features - context-pad-tools', function() {

  var diagramXML = require('../../../fixtures/cmmn/context-pad-tools.cmmn');

  function open(id) {
    var html;

    inject(function(elementRegistry, contextPad) {
      var target = element(elementRegistry, id);

      contextPad.open(target);

      html = contextPad._current.html;

      // diagram-js places the pad on the next frame: place it now
      var position = contextPad._getPosition(target);

      html.style.left = position.left + 'px';
    })();

    return html;
  }

  function actions(html, group) {
    return Array.prototype.map.call(
      domQueryAll('.group[data-group="' + group + '"] .entry', html),
      function(entry) {
        return entry.getAttribute('data-action');
      }
    );
  }


  describe('the tools', function() {

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ contextPadToolsModule, contextPadClipboardModule, contextPadHelpModule ],
      help: { open: function() {} }
    }));


    it('should put the tools together in Flowable Design\'s order', function() {

      // when
      var html = open('PI_Task_1');

      // then
      expect(actions(html, 'edit')).to.eql([ 'replace', 'connect', 'copy', 'cut', 'delete', 'help' ]);
      expect(actions(html, 'connect')).to.eql([]);
      expect(actions(html, 'model')).not.to.be.empty;
    });

  });


  describe('the position', function() {

    var visibleRight = Infinity;

    beforeEach(function() {
      visibleRight = Infinity;
    });

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ contextPadToolsModule ],
      contextPadPosition: {
        visibleRight: function() {
          return visibleRight;
        }
      }
    }));

    beforeEach(inject(function(canvas) {
      canvas.zoom(1, { x: 0, y: 0 });
    }));


    it('should split the pad around the shape when both sides fit', inject(function(canvas) {

      // when
      var html = open('PI_Task_1');

      // then
      expect(html.classList.contains('split')).to.be.true;
      expect(html.style.getPropertyValue('--context-pad-span')).to.equal('116px');
    }));


    it('should put the whole pad on one side when the canvas is covered', inject(function(canvas) {

      // given
      var container = canvas.getContainer().getBoundingClientRect();

      // the task ends at x 500: the visible canvas ends right after it
      visibleRight = container.left + 520;

      // when
      var html = open('PI_Task_1');

      // then
      expect(html.classList.contains('split')).to.be.false;
      expect(parseFloat(html.style.left)).to.be.below(400);
    }));


    it('should keep a connection\'s pad where diagram-js puts it', function() {

      // when
      var html = open('connection');

      // then
      expect(html.classList.contains('split')).to.be.false;
    });

  });


  describe('regroupTools', function() {

    it('should put Connect with the tools, in order, before the append actions', function() {

      // given
      var entries = {
        'append.human-task': { group: 'model' },
        'delete': { group: 'edit' },
        'custom': { group: 'edit' },
        'replace': { group: 'edit' },
        'connect': { group: 'connect' }
      };

      // when
      var result = regroupTools(entries);

      // then
      expect(Object.keys(result)).to.eql([ 'replace', 'connect', 'delete', 'custom', 'append.human-task' ]);
      expect(result.connect.group).to.equal('edit');
      expect(result['append.human-task'].group).to.equal('model');
      expect(entries.connect.group).to.equal('connect');
    });

  });


  describe('padLeft', function() {

    var container = { left: 100, right: 900, top: 0 };

    it('should put the pad right of the shape when it fits', function() {
      expect(padLeft({ left: 300, right: 400, top: 0 }, container, Infinity, 72, 8)).to.equal(308);
    });


    it('should put it left of a shape near the canvas edge', function() {
      expect(padLeft({ left: 750, right: 850, top: 0 }, container, Infinity, 72, 8)).to.equal(750 - 100 - 8 - 72);
    });


    it('should put it left of a shape under a covered part of the canvas', function() {
      expect(padLeft({ left: 400, right: 520, top: 0 }, container, 580, 114, 8)).to.equal(400 - 100 - 8 - 114);
    });


    it('should keep it inside the canvas when there is no room on either side', function() {
      expect(padLeft({ left: 110, right: 890, top: 0 }, container, Infinity, 72, 8)).to.equal(0);
    });

  });


  describe('splitLeft', function() {

    var container = { left: 100, right: 900, top: 0 };

    it('should put the append actions right of the shape and the tools left of it', function() {
      expect(splitLeft({ left: 300, right: 400, top: 0 }, container, Infinity, 36, 36, 8)).to.equal(308);
    });


    it('should give up when the append actions would pass the canvas edge or its covered part', function() {
      expect(splitLeft({ left: 750, right: 870, top: 0 }, container, Infinity, 36, 36, 8)).to.be.null;
      expect(splitLeft({ left: 400, right: 520, top: 0 }, container, 550, 36, 36, 8)).to.be.null;
    });


    it('should give up when the tools would cover the open palette', function() {
      expect(splitLeft({ left: 300, right: 400, top: 0 }, container, Infinity, 36, 36, 8, 260)).to.be.null;
      expect(splitLeft({ left: 300, right: 400, top: 0 }, container, Infinity, 36, 36, 8, 250)).to.equal(308);
    });


    it('should give up when the tools would pass the left edge of the canvas', function() {
      expect(splitLeft({ left: 130, right: 230, top: 0 }, container, Infinity, 36, 36, 8)).to.be.null;
    });

  });


  describe('padTop', function() {

    var container = { top: 50, bottom: 650 };

    it('should put the pad level with the shape\'s top when it fits', function() {
      expect(padTop(200, container, 300)).to.equal(150);
    });


    it('should move it up next to a shape near the bottom of the canvas', function() {
      expect(padTop(500, container, 300)).to.equal(600 - 300);
    });


    it('should keep it inside the canvas when it is taller than the canvas', function() {
      expect(padTop(500, container, 700)).to.equal(0);
    });

  });

});
