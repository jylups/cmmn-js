'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject */

var contextPadHelpModule = require('../../../../lib/features/context-pad-help'),
    HelpPages = require('../../../../lib/features/context-pad-help/HelpPages');

var helpUrl = HelpPages.helpUrl,
    REFERENCE = HelpPages.REFERENCE,
    EDITOR_GUIDE = HelpPages.EDITOR_GUIDE;


function element(elementRegistry, id) {

  // the on part's connection
  if (id === 'connection') {
    return elementRegistry.filter(function(e) {
      return !!e.waypoints;
    })[0];
  }

  return elementRegistry.get(id);
}


describe('features - context-pad-help', function() {

  var diagramXML = require('../../../fixtures/cmmn/context-pad-tools.cmmn');

  function entriesOf(id) {
    var entries;

    inject(function(elementRegistry, contextPad) {
      entries = contextPad.getEntries(element(elementRegistry, id));
    })();

    return entries;
  }


  describe('by default', function() {

    var opened = [];

    beforeEach(function() {
      opened = [];
    });

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ contextPadHelpModule ],
      help: {
        open: function(url, element) {
          opened.push({ url: url, id: element.id });
        }
      }
    }));


    it('should open the reference page of the element\'s type', function() {

      // given
      var help = entriesOf('PI_Task_1').help;

      expect(help).to.include({ group: 'edit', title: 'Help' });

      // when
      help.action.click();

      // then
      expect(opened).to.eql([ { url: REFERENCE + 'human-task', id: 'PI_Task_1' } ]);
    });


    it('should have no help for a connection', function() {
      expect(entriesOf('connection').help).not.to.exist;
    });

  });


  describe('with a host\'s pages', function() {

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ contextPadHelpModule ],
      help: {
        title: 'What is this?',
        url: function(element) {
          return element.id === 'PI_Task_1' ? 'https://example.com/task' : null;
        },
        open: function() {}
      }
    }));


    it('should use the host\'s page and title', function() {
      expect(entriesOf('PI_Task_1').help).to.include({ title: 'What is this?' });
      expect(entriesOf('PI_Milestone_1').help).not.to.exist;
    });

  });


  describe('helpUrl', function() {

    function definition(type, attrs) {
      return {
        $type: type,
        get: function(name) {
          return (attrs || {})[name];
        }
      };
    }

    function planItem(type, attrs) {
      return { businessObject: { $type: 'cmmn:PlanItem', definitionRef: definition(type, attrs) } };
    }


    it('should give the reference page of the element\'s type', function() {
      expect(helpUrl(planItem('cmmn:HumanTask'))).to.equal(REFERENCE + 'human-task');
      expect(helpUrl(planItem('cmmn:ProcessTask'))).to.equal(REFERENCE + 'process-task');
      expect(helpUrl(planItem('cmmn:Milestone'))).to.equal(REFERENCE + 'milestone');
      expect(helpUrl({ businessObject: { $type: 'cmmn:EntryCriterion' } })).to.equal(REFERENCE + 'entry-criterion');
    });


    it('should know the case plan model and Flowable\'s kinds of task and event listener', function() {
      expect(helpUrl({ businessObject: { $type: 'cmmn:Stage', $parent: { $type: 'cmmn:Case' } } }))
        .to.equal(REFERENCE + 'case-plan-model');
      expect(helpUrl(planItem('cmmn:Task', { 'flowable:type': 'http' }))).to.equal(REFERENCE + 'http-task');
      expect(helpUrl(planItem('cmmn:Task', { 'flowable:type': 'mail' }))).to.equal(REFERENCE + 'email-task');
      expect(helpUrl(planItem('cmmn:EventListener', { 'flowable:eventType': 'variable' })))
        .to.equal(REFERENCE + 'variable-event-listener');
      expect(helpUrl(planItem('cmmn:EventListener'))).to.equal(REFERENCE + 'event-listener');
    });


    it('should fall back to the Case Editor guide, with nothing for a connection or another model', function() {
      expect(helpUrl(planItem('cmmn:Task'))).to.equal(EDITOR_GUIDE);
      expect(helpUrl({ waypoints: [], businessObject: { $type: 'cmmn:PlanItemOnPart' } })).to.be.null;
      expect(helpUrl({ businessObject: { $type: 'bpmn:UserTask' } })).to.be.null;
      expect(helpUrl({ labelTarget: {}, businessObject: { $type: 'cmmn:PlanItem' } })).to.be.null;
    });

  });

});
