'use strict';

/* global bootstrapModeler, inject */

var coreModule = require('../../../../lib/core'),
    modelingModule = require('../../../../lib/features/modeling'),
    contextPadModule = require('../../../../lib/features/context-pad');


describe('features/append - connected', function() {

  var diagramXML = require('../../../fixtures/cmmn/simple.cmmn');

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [ coreModule, modelingModule, contextPadModule ]
  }));

  var source;

  beforeEach(inject(function(elementRegistry) {
    source = elementRegistry.filter(function(element) {
      return element.type === 'cmmn:PlanItem' &&
        element.businessObject.definitionRef.$type === 'cmmn:HumanTask';
    })[0];
  }));


  it('should place a human task to the right, started by the source', inject(function(appendConnected) {

    // when
    var result = appendConnected.append(source, 'cmmn:HumanTask');

    // then
    var shape = result.shape,
        criterion = result.criterion,
        connection = result.connection;

    expect(shape.businessObject.definitionRef.$type).to.equal('cmmn:HumanTask');
    expect(shape.parent).to.equal(source.parent);
    expect(shape.x).to.be.above(source.x + source.width);

    expect(criterion.businessObject.$type).to.equal('cmmn:EntryCriterion');
    expect(criterion.host).to.equal(shape);

    expect(connection.source).to.equal(source);
    expect(connection.target).to.equal(criterion);

    var onPart = connection.businessObject.cmmnElementRef;

    expect(onPart.$type).to.equal('cmmn:PlanItemOnPart');
    expect(onPart.sourceRef).to.equal(source.businessObject);
    expect(onPart.standardEvent).to.equal('complete');
  }));


  it('should append a milestone', inject(function(appendConnected) {

    // when
    var result = appendConnected.append(source, 'cmmn:Milestone');

    // then
    expect(result.shape.businessObject.definitionRef.$type).to.equal('cmmn:Milestone');
  }));


  it('should be undone and redone as one', inject(function(appendConnected, commandStack, elementRegistry) {

    // given
    var result = appendConnected.append(source, 'cmmn:HumanTask');

    // when
    commandStack.undo();

    // then
    expect(elementRegistry.get(result.shape.id)).not.to.exist;
    expect(elementRegistry.get(result.criterion.id)).not.to.exist;
    expect(elementRegistry.get(result.connection.id)).not.to.exist;

    // when
    commandStack.redo();

    // then
    expect(elementRegistry.get(result.shape.id)).to.exist;
    expect(elementRegistry.get(result.connection.id)).to.exist;
  }));


  it('should not place two appended plan items on each other', inject(function(appendConnected) {

    // when
    var first = appendConnected.append(source, 'cmmn:HumanTask').shape,
        second = appendConnected.append(source, 'cmmn:HumanTask').shape;

    // then
    expect(second.y).to.be.at.least(first.y + first.height);
  }));


  it('should be offered in the context pad of a plan item', inject(function(contextPadProvider) {

    // when
    var entries = contextPadProvider.getContextPadEntries(source);

    // then
    expect(entries['append.human-task']).to.exist;
    expect(entries['append.milestone']).to.exist;
    expect(entries['append.exitCriterion']).to.exist;
  }));


  it('should not be offered on the case plan model', inject(function(contextPadProvider, canvas) {

    // given
    var casePlanModel = canvas.getRootElement().children.filter(function(element) {
      return element.businessObject.$type === 'cmmn:Stage';
    })[0];

    // when
    var entries = contextPadProvider.getContextPadEntries(casePlanModel);

    // then
    expect(entries['append.human-task']).not.to.exist;
  }));

});
