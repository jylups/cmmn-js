'use strict';

var coreModule = require('../../../lib/core');

var DEFAULT_THEME = require('../../../lib/draw/CmmnRenderer').DEFAULT_THEME;

var domQuery = require('min-dom').query;

/* global bootstrapViewer, inject */


describe('draw - cmmn renderer theme', function() {

  var diagramXML = require('../../fixtures/cmmn/renderer/theme.cmmn');

  function visual(elementRegistry, id) {
    return domQuery('.djs-visual', elementRegistry.getGraphics(id));
  }


  describe('defaults, in the style of Flowable Design', function() {

    beforeEach(bootstrapViewer(diagramXML, { modules: [ coreModule ] }));


    it('should draw stages as rounded rectangles', inject(function(elementRegistry) {

      // then
      var rect = domQuery('rect', visual(elementRegistry, 'PI_Stage'));

      expect(rect).to.exist;
      expect(rect.getAttribute('rx')).to.equal(String(DEFAULT_THEME.stageRadius));
      expect(rect.style.stroke || rect.getAttribute('stroke')).to.match(/#64748b|rgb\(100, 116, 139\)/);
    }));


    it('should draw labels in the theme font', inject(function(elementRegistry) {

      // then
      var text = domQuery('text', visual(elementRegistry, 'PI_Stage'));

      expect(text.style.fontFamily).to.contain('Segoe UI');
    }));


    it('should cut a label that does not fit with an ellipsis', inject(function(elementRegistry) {

      // then
      var text = domQuery('text', visual(elementRegistry, 'PI_Long')).textContent;

      expect(text).to.match(/…$/);
      expect(text.length).to.be.below(
        'Review the application of the customer and every attached document before approving it'.length);
    }));


    it('should mark criteria whose sentry has a condition', inject(function(elementRegistry) {

      // then
      function stroke(id) {
        var polygon = domQuery('polygon', visual(elementRegistry, id));

        return polygon.style.stroke || polygon.getAttribute('stroke');
      }

      expect(stroke('Entry_Condition')).to.match(/#ca8a04|rgb\(202, 138, 4\)/);
      expect(stroke('Entry_Plain')).not.to.match(/#ca8a04|rgb\(202, 138, 4\)/);
      expect(stroke('Exit_Condition')).to.match(/#ca8a04|rgb\(202, 138, 4\)/);
    }));

  });


  describe('configured', function() {

    beforeEach(bootstrapViewer(diagramXML, {
      modules: [ coreModule ],
      cmmnRenderer: {
        stageShape: 'octagon',
        fontFamily: 'Geist, sans-serif'
      }
    }));


    it('should draw the angled stages of the CMMN specification', inject(function(elementRegistry) {

      // then: the stage's own shape comes first, its markers after it
      var shape = visual(elementRegistry, 'PI_Stage').firstElementChild;

      expect(shape.tagName).to.equal('polygon');
    }));


    it('should use the configured font', inject(function(elementRegistry) {

      // then
      expect(domQuery('text', visual(elementRegistry, 'PI_Stage')).style.fontFamily).to.contain('Geist');
    }));

  });



  describe('Flowable types', function() {

    var typesXML = require('../../fixtures/cmmn/renderer/flowable-types.cmmn');

    var TYPE_ICONS = require('../../../lib/draw/CmmnRenderer').TYPE_ICONS;

    beforeEach(bootstrapViewer(typesXML, { modules: [ coreModule ] }));

    function icon(elementRegistry, id) {
      return domQuery('.cjs-type-icon', visual(elementRegistry, id));
    }


    it('should draw the icon of each task type', inject(function(elementRegistry) {

      // then
      [
        [ 'PI_java', 'java' ],
        [ 'PI_script', 'script' ],
        [ 'PI_http', 'http' ],
        [ 'PI_mail', 'mail' ],
        [ 'PI_send', 'send-event' ],
        [ 'PI_worker', 'external-worker' ],
        [ 'PI_page', 'casePage' ]
      ].forEach(function(item) {
        var path = icon(elementRegistry, item[0]);

        expect(path, item[0]).to.exist;
        expect(path.getAttribute('d')).to.equal(TYPE_ICONS.task[item[1]]);
      });

      expect(icon(elementRegistry, 'PI_plain')).not.to.exist;
    }));


    it('should draw the icon of each event listener type', inject(function(elementRegistry) {

      // then
      expect(icon(elementRegistry, 'PI_signal').getAttribute('d')).to.equal(TYPE_ICONS.listener.signal);
      expect(icon(elementRegistry, 'PI_variable').getAttribute('d')).to.equal(TYPE_ICONS.listener.variable);
      expect(icon(elementRegistry, 'PI_reactivate').getAttribute('d')).to.equal(TYPE_ICONS.listener.reactivate);
      expect(icon(elementRegistry, 'PI_registry').getAttribute('d')).to.equal(TYPE_ICONS.listener.registry);
      expect(icon(elementRegistry, 'PI_listener')).not.to.exist;
    }));

  });

});
