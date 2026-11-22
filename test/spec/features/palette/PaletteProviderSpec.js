'use strict';

/* global bootstrapModeler, inject */

var modelingModule = require('../../../../lib/features/modeling'),
    paletteModule = require('../../../../lib/features/palette'),
    coreModule = require('../../../../lib/core');

var PaletteItems = require('../../../../lib/features/palette/PaletteItems');

var domQuery = require('min-dom').query,
    domQueryAll = require('min-dom').queryAll;

// enough of the Flowable moddle extension for its attributes to be written
var flowablePackage = {
  name: 'Flowable',
  prefix: 'flowable',
  uri: 'http://flowable.org/cmmn',
  xml: { tagAlias: 'lowerCase' },
  types: []
};


describe('features/palette', function() {

  var diagramXML = require('../../../fixtures/cmmn/simple.cmmn');

  var testModules = [ coreModule, modelingModule, paletteModule ];

  function entryIds(canvas) {
    var paletteElement = domQuery('.djs-palette', canvas._container);

    return Array.prototype.map.call(domQueryAll('.entry', paletteElement), function(entry) {
      return entry.getAttribute('data-action');
    });
  }

  function menuEntries(paletteProvider, group) {
    return Object.keys(paletteProvider.getPopupMenuEntries({ paletteGroup: group }));
  }


  describe('without the Flowable moddle', function() {

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


    it('should group the palette as Flowable Design does', inject(function(canvas) {

      // then
      expect(entryIds(canvas)).to.eql([
        'hand-tool', 'lasso-tool', 'space-tool', 'global-connect-tool',
        'create.tasks', 'create.containers', 'create.sentries', 'create.listeners',
        'create.text-annotation', 'create.casePlanModel', 'create.caseFileItem',
        'favorite.human-task', 'favorite.case-task', 'favorite.process-task'
      ]);
    }));


    it('should offer the CMMN items in the menus', inject(function(paletteProvider) {

      // then
      expect(menuEntries(paletteProvider, 'tasks')).to.eql([
        'create-human-task', 'create-case-task', 'create-process-task', 'create-milestone',
        'create-decision-task', 'create-task'
      ]);
      expect(menuEntries(paletteProvider, 'containers')).to.eql([ 'create-stage', 'create-plan-fragment' ]);
      expect(menuEntries(paletteProvider, 'sentries')).to.eql([ 'create-entry-criterion', 'create-exit-criterion' ]);
      expect(menuEntries(paletteProvider, 'listeners')).to.eql([
        'create-timer-event-listener', 'create-user-event-listener', 'create-event-listener'
      ]);
    }));


    it('should open a menu from a group button', inject(function(canvas, popupMenu) {

      // given
      var button = domQuery('.djs-palette [data-action="create.sentries"]', canvas._container);

      // when
      button.click();

      // then
      expect(popupMenu.isOpen()).to.be.true;
      expect(domQueryAll('.djs-popup .entry', document.body).length).to.equal(2);
    }));

  });


  describe('with the Flowable moddle', function() {

    beforeEach(bootstrapModeler(diagramXML, {
      modules: testModules,
      moddleExtensions: { flowable: flowablePackage }
    }));


    it('should offer Flowable\'s task and listener types', inject(function(paletteProvider) {

      // then
      expect(menuEntries(paletteProvider, 'tasks')).to.include.members([
        'create-case-page', 'create-service-task', 'create-script-task', 'create-mail-task',
        'create-http-task', 'create-send-event-task', 'create-external-worker-task'
      ]);
      expect(menuEntries(paletteProvider, 'listeners')).to.include.members([
        'create-signal-event-listener', 'create-variable-event-listener',
        'create-intent-event-listener', 'create-reactivate-event-listener'
      ]);
    }));


    it('should add the service task to the favorites', inject(function(canvas) {

      // then
      expect(entryIds(canvas)).to.include('favorite.service-task');
    }));


    it('should create typed tasks and listeners', inject(function(elementFactory) {

      // when
      var task = PaletteItems.ITEMS['http-task'].create(elementFactory),
          listener = PaletteItems.ITEMS['variable-event-listener'].create(elementFactory);

      // then
      expect(task.businessObject.definitionRef.$type).to.equal('cmmn:Task');
      expect(task.businessObject.definitionRef.get('flowable:type')).to.equal('http');
      expect(listener.businessObject.definitionRef.$type).to.equal('cmmn:EventListener');
      expect(listener.businessObject.definitionRef.get('flowable:eventType')).to.equal('variable');
    }));


    it('should create an exit criterion, a plan fragment and a text annotation', inject(function(elementFactory) {

      // when
      var exit = PaletteItems.ITEMS['exit-criterion'].create(elementFactory),
          fragment = PaletteItems.ITEMS['plan-fragment'].create(elementFactory),
          annotation = PaletteItems.ITEMS['text-annotation'].create(elementFactory);

      // then
      expect(exit.businessObject.$type).to.equal('cmmn:ExitCriterion');
      expect(fragment.businessObject.definitionRef.$type).to.equal('cmmn:PlanFragment');
      expect(annotation.businessObject.$type).to.equal('cmmn:TextAnnotation');
    }));

  });


  describe('configured favorites', function() {

    beforeEach(bootstrapModeler(diagramXML, {
      modules: testModules,
      palette: { favorites: [ 'milestone', 'exit-criterion', 'service-task' ] }
    }));


    it('should show them, leaving out Flowable types without the Flowable moddle', inject(function(canvas) {

      // then
      var favorites = entryIds(canvas).filter(function(id) {
        return id.indexOf('favorite.') === 0;
      });

      expect(favorites).to.eql([ 'favorite.milestone', 'favorite.exit-criterion' ]);
    }));

  });

});
