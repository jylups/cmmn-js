'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject, sinon */

var contextPadClipboardModule = require('../../../../lib/features/context-pad-clipboard'),
    copyTargets = require('../../../../lib/features/context-pad-clipboard/ContextPadClipboard').copyTargets;


function element(elementRegistry, id) {

  // the on part's connection
  if (id === 'connection') {
    return elementRegistry.filter(function(e) {
      return !!e.waypoints;
    })[0];
  }

  return elementRegistry.get(id);
}


describe('features - context-pad-clipboard', function() {

  var diagramXML = require('../../../fixtures/cmmn/context-pad-tools.cmmn');

  function entriesOf(id) {
    var entries;

    inject(function(elementRegistry, contextPad) {
      entries = contextPad.getEntries(element(elementRegistry, id));
    })();

    return entries;
  }

  function copy(ids) {
    inject(function(elementRegistry, copyPaste) {
      copyPaste.copy(ids.map(function(id) {
        return element(elementRegistry, id);
      }));
    })();
  }


  describe('with the case rules', function() {

    beforeEach(bootstrapModeler(diagramXML, { additionalModules: [ contextPadClipboardModule ] }));


    it('should offer Copy and Cut on a shape, with the tools', function() {

      // when
      var entries = entriesOf('PI_Task_1');

      // then
      expect(entries.copy).to.include({ group: 'edit', title: 'Copy' });
      expect(entries.cut).to.include({ group: 'edit', title: 'Cut' });
      expect(entries.paste).not.to.exist;
    });


    it('should not copy the case plan, a connection or a label', function() {
      expect(entriesOf('CasePlanModel_1').copy).not.to.exist;
      expect(entriesOf('connection').copy).not.to.exist;
    });


    it('should offer Paste on the case plan and an expanded stage while something is copied', function() {

      // given
      expect(entriesOf('CasePlanModel_1').paste).not.to.exist;

      // when
      copy([ 'PI_Task_1' ]);

      // then
      expect(entriesOf('CasePlanModel_1').paste).to.include({ group: 'edit', title: 'Paste' });
      expect(entriesOf('PI_Stage_1').paste).to.exist;
      expect(entriesOf('PI_Collapsed_1').paste).not.to.exist;
      expect(entriesOf('PI_Task_1').paste).not.to.exist;
    });


    it('should copy the selection when the shape is in it', inject(function(elementRegistry, selection, copyPaste) {

      // given
      var task = elementRegistry.get('PI_Task_1'),
          milestone = elementRegistry.get('PI_Milestone_1'),
          spy = sinon.spy(copyPaste, 'copy');

      selection.select([ task, milestone ]);

      // when
      entriesOf('PI_Task_1').copy.action.click();

      // then
      expect(spy).to.have.been.calledWith([ task, milestone ]);
    }));


    it('should cut the shape alone when it is not selected', inject(function(elementRegistry, selection, copyPaste) {

      // given
      var task = elementRegistry.get('PI_Task_1'),
          spy = sinon.spy(copyPaste, 'cut');

      selection.select(elementRegistry.get('PI_Milestone_1'));

      // when
      entriesOf('PI_Task_1').cut.action.click();

      // then
      expect(spy).to.have.been.calledWith([ task ]);
    }));


    it('should paste in the middle of the stage', inject(function(elementRegistry, copyPaste) {

      // given
      var stage = elementRegistry.get('PI_Stage_1');

      copy([ 'PI_Milestone_1' ]);

      var spy = sinon.spy(copyPaste, 'paste');

      // when
      entriesOf('PI_Stage_1').paste.action.click();

      // then
      expect(spy).to.have.been.calledWith({ element: stage, point: { x: 550, y: 325 } });
      expect(stage.children.length).to.equal(1);
    }));

  });


  describe('with a host\'s rules', function() {

    var rules = {
      canCopy: function(element) {
        return element.id === 'PI_Milestone_1';
      },
      canPasteInto: function(element) {
        return element.id === 'PI_Task_1';
      }
    };

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [
        contextPadClipboardModule,
        { contextPadClipboardRules: [ 'value', rules ] }
      ]
    }));


    it('should offer what the host\'s rules allow', function() {

      // when
      copy([ 'PI_Milestone_1' ]);

      // then
      expect(entriesOf('PI_Task_1').copy).not.to.exist;
      expect(entriesOf('PI_Milestone_1').copy).to.exist;
      expect(entriesOf('PI_Task_1').paste).to.exist;
      expect(entriesOf('CasePlanModel_1').paste).not.to.exist;
    });

  });


  describe('with a shared clipboard', function() {

    var Clipboard = require('diagram-js/lib/features/clipboard/Clipboard').default;

    var shared = new Clipboard();

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [
        contextPadClipboardModule,
        { clipboard: [ 'value', shared ] }
      ]
    }));


    it('should paste what was copied into the shared clipboard', function() {

      // when
      copy([ 'PI_Task_1' ]);

      // then
      expect(shared.isEmpty()).to.be.false;
      expect(entriesOf('CasePlanModel_1').paste).to.exist;
    });

  });


  describe('copyTargets', function() {

    it('should take the selection when the shape is in it, else the shape', function() {
      var task = { id: 'Task' },
          other = { id: 'Other' };

      expect(copyTargets(task, [ task, other ])).to.eql([ task, other ]);
      expect(copyTargets(task, [ other ])).to.eql([ task ]);
    });

  });

});
