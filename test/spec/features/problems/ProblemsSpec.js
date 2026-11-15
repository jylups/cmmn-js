'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject */

var coreModule = require('../../../../lib/core'),
    modelingModule = require('../../../../lib/features/modeling'),
    problemsModule = require('../../../../lib/features/problems');

var domQuery = require('min-dom').query;


describe('features - problems', function() {

  var diagramXML = require('./problems.cmmn');

  var testModules = [ coreModule, modelingModule, problemsModule ];


  function kinds(problems) {
    return problems.map(function(problem) {
      return problem.kind;
    });
  }


  describe('from import warnings', function() {

    beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


    it('should list what is lost first, what is kept last', inject(function(problems) {

      // when
      var all = problems.getProblems();

      // then
      expect(kinds(all)).to.eql([
        'unparsable-content',
        'unresolved-reference',
        'unresolved-reference',
        'unknown-attribute'
      ]);

      expect(all.map(function(problem) { return problem.severity; })).to.eql([
        'error', 'error', 'error', 'info'
      ]);
    }));


    it('should explain an unresolved reference', inject(function(problems, elementRegistry) {

      // when
      var problem = problems.getProblems(elementRegistry.get('EntryCriterion_1'))[0];

      // then
      expect(problem.kind).to.eql('unresolved-reference');
      expect(problem.removedOnSave).to.be.true;
      expect(problem.message).to.eql(
        'Entry criterion \'EntryCriterion_1\' refers to sentry \'Sentry_Missing\', which is not in this file. ' +
        'The reference is removed when the model is saved.'
      );
    }));


    it('should report a diagram shape without its model element once', inject(function(problems) {

      // when
      var shapeProblems = problems.getProblems().filter(function(problem) {
        return problem.businessObject && problem.businessObject.id === 'DI_Missing';
      });

      // then
      expect(kinds(shapeProblems)).to.eql([ 'unresolved-reference' ]);
      expect(shapeProblems[0].element).to.be.null;
      expect(shapeProblems[0].message).to.contain('Diagram shape \'DI_Missing\' refers to model element \'Missing_1\'');
    }));


    it('should explain unparsable content with its position', inject(function(problems) {

      // when
      var problem = problems.getProblems()[0];

      // then
      expect(problem.kind).to.eql('unparsable-content');
      expect(problem.message).to.match(
        /^Part of the file could not be read \(<cmmn:unknownElement\/?>\) at line 11, column 6\. It is removed when the model is saved\.$/
      );
    }));


    it('should attach a problem of a definition to its plan item', inject(function(problems, elementRegistry) {

      // when
      var problem = problems.getProblems(elementRegistry.get('PI_Unknown'))[0];

      // then
      expect(problem.kind).to.eql('unknown-attribute');
      expect(problem.removedOnSave).to.be.false;
      expect(problem.message).to.eql(
        'Task \'Approve\' has the attribute unknownAttribute, which the editor does not recognise. ' +
        'It is kept when the model is saved.'
      );
    }));


    it('should list what saving removes', inject(function(problems) {

      // then
      expect(kinds(problems.getRemovedOnSave())).to.eql([
        'unparsable-content',
        'unresolved-reference',
        'unresolved-reference'
      ]);
    }));


    it('should mark the elements with problems', inject(function(canvas, elementRegistry, overlays) {

      // then
      var criterion = elementRegistry.get('EntryCriterion_1'),
          planItem = elementRegistry.get('PI_Unknown');

      expect(canvas.hasMarker(criterion, 'cjs-has-problem')).to.be.true;
      expect(overlays.get({ element: criterion, type: 'problems' })).to.have.length(1);

      // what is only not recognised is not marked
      expect(canvas.hasMarker(planItem, 'cjs-has-problem')).to.be.false;
      expect(overlays.get({ element: planItem, type: 'problems' })).to.be.empty;

      // the overlay explains the problem
      var badge = domQuery('.cjs-problems-badge', overlays.get({ element: criterion })[0].htmlContainer);

      expect(badge.title).to.contain('Sentry_Missing');
    }));


    it('should select the element of a badge', inject(function(elementRegistry, overlays, selection) {

      // given
      var criterion = elementRegistry.get('EntryCriterion_1'),
          badge = domQuery('.cjs-problems-badge', overlays.get({ element: criterion })[0].htmlContainer);

      // when
      badge.click();

      // then
      expect(selection.get()).to.eql([ criterion ]);
    }));


    it('should drop a problem once the reference is set', inject(
      function(problems, elementRegistry, elementFactory, modeling, canvas, eventBus, commandStack) {

        // given
        var criterion = elementRegistry.get('EntryCriterion_1'),
            sentry = criterion.businessObject.$parent.$parent.get('sentries')[0],
            changed = [];

        eventBus.on('problems.changed', function(event) {
          changed.push(event.problems.length);
        });

        // when
        modeling.updateProperties(criterion, { sentryRef: sentry });

        // then
        expect(problems.getProblems(criterion)).to.be.empty;
        expect(canvas.hasMarker(criterion, 'cjs-has-problem')).to.be.false;
        expect(changed).to.eql([ 3 ]);
        expect(kinds(problems.getRemovedOnSave())).to.eql([ 'unparsable-content', 'unresolved-reference' ]);
      }
    ));

  });


  describe('config', function() {

    beforeEach(bootstrapModeler(diagramXML, {
      modules: testModules,
      problems: { ignoredAttributes: [ 'unknownAttribute' ] }
    }));


    it('should leave out ignored attributes', inject(function(problems) {

      // then
      expect(kinds(problems.getProblems())).not.to.include('unknown-attribute');
    }));

  });


  describe('model without a diagram', function() {

    var noDiagramXML =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<cmmn:definitions xmlns:cmmn="http://www.omg.org/spec/CMMN/20151109/MODEL" ' +
        'id="NoDiagram" targetNamespace="http://bpmn.io/schema/cmmn">' +
        '<cmmn:case id="Case_1"><cmmn:casePlanModel id="CasePlanModel_1" /></cmmn:case>' +
      '</cmmn:definitions>';

    beforeEach(bootstrapModeler(noDiagramXML, { modules: testModules }));


    it('should say the elements are not shown', inject(function(problems) {

      // then
      var all = problems.getProblems();

      expect(kinds(all)).to.eql([ 'no-diagram' ]);
      expect(all[0].removedOnSave).to.be.false;
      expect(all[0].message).to.eql('The file has no diagram, so its elements are not shown.');
    }));

  });

});
