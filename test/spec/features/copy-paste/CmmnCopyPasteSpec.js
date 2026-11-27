'use strict';

/* global bootstrapModeler, inject */

var coreModule = require('../../../../lib/core'),
    modelingModule = require('../../../../lib/features/modeling'),
    editorActionsModule = require('../../../../lib/features/editor-actions'),
    copyPasteModule = require('../../../../lib/features/copy-paste');


describe('features/copy-paste', function() {

  var diagramXML = require('./copy-paste.cmmn');

  beforeEach(bootstrapModeler(diagramXML, {
    modules: [ coreModule, modelingModule, editorActionsModule, copyPasteModule ]
  }));


  var plan;

  beforeEach(inject(function(elementRegistry) {
    plan = elementRegistry.get('CasePlanModel_1');
  }));

  function paste(point) {
    var pasted;

    inject(function(copyPaste) {
      pasted = copyPaste.paste({ element: plan, point: point || { x: 600, y: 200 } });
    })();

    return pasted;
  }

  function copy(ids) {
    inject(function(elementRegistry, copyPaste) {
      copyPaste.copy(ids.map(function(id) {
        return elementRegistry.get(id);
      }));
    })();
  }

  function byType(elements, type) {
    return elements.filter(function(element) {
      return element.businessObject && element.businessObject.$instanceOf &&
        element.businessObject.$instanceOf(type);
    });
  }

  function onPartOf(elements) {
    return elements.filter(function(element) {
      var ref = element.businessObject && element.businessObject.cmmnElementRef;

      return ref && ref.$instanceOf('cmmn:OnPart');
    })[0];
  }


  it('should paste a plan item with a new definition, its item control and extension elements', function() {

    // given
    copy([ 'PI_Task_1' ]);

    // when
    var pasted = paste();

    // then
    var item = byType(pasted, 'cmmn:PlanItem')[0].businessObject,
        old = plan.businessObject.planItems[0];

    expect(item.id).not.to.equal('PI_Task_1');
    expect(item.definitionRef).not.to.equal(old.definitionRef);
    expect(item.definitionRef.id).not.to.equal('Task_1');
    expect(item.definitionRef.name).to.equal('Report');
    expect(item.definitionRef.$parent).to.equal(plan.businessObject);
    expect(plan.businessObject.planItemDefinitions).to.include(item.definitionRef);

    // the item control, a copy
    expect(item.itemControl.requiredRule).to.exist;
    expect(item.itemControl).not.to.equal(old.itemControl);

    // Flowable's attributes and extension elements, known or not, copied
    expect(item.definitionRef.$attrs['flowable:sameDeployment']).to.equal('true');

    var values = item.definitionRef.extensionElements.values;

    expect(values).to.have.length(2);
    expect(values[0]).not.to.equal(old.definitionRef.extensionElements.values[0]);
    expect(values[0].$type).to.equal('flowable:in');
    expect(values[0].sourceExpression).to.equal('${firstName}');
    expect(values[1].$body).to.equal('ProcessTask');
    expect(values[1].$parent).to.equal(item.definitionRef.extensionElements);
  });


  it('should paste a criterion with a new sentry, and an on-part to the pasted source', function() {

    // given
    copy([ 'PI_Task_1', 'PI_EventListener_1', 'EntryCriterion_1' ]);

    // when
    var pasted = paste();

    // then
    var criterion = byType(pasted, 'cmmn:EntryCriterion')[0].businessObject,
        listener = byType(pasted, 'cmmn:PlanItem').filter(function(e) {
          return e.businessObject.name === 'Listener';
        })[0].businessObject,
        sentry = criterion.sentryRef;

    expect(sentry.id).not.to.equal('Sentry_1');
    expect(plan.businessObject.sentries).to.include(sentry);
    expect(sentry.ifPart.condition.body).to.equal('${approved}');
    expect(sentry.onParts).to.have.length(1);
    expect(sentry.onParts[0].sourceRef).to.equal(listener);
    expect(sentry.onParts[0].standardEvent).to.equal('occur');
    expect(onPartOf(pasted)).to.exist;

    // the original is unchanged
    var oldSentry = plan.businessObject.sentries[0];

    expect(oldSentry.onParts[0].sourceRef.id).to.equal('PI_EventListener_1');
  });


  it('should drop an on-part whose source isn\'t pasted', function() {

    // given
    copy([ 'PI_Task_1', 'EntryCriterion_1' ]);

    // when
    var pasted = paste();

    // then
    var criterion = byType(pasted, 'cmmn:EntryCriterion')[0].businessObject;

    expect(criterion.sentryRef).to.exist;
    expect(plan.businessObject.sentries).to.include(criterion.sentryRef);
    expect(criterion.sentryRef.onParts || []).to.be.empty;
    expect(onPartOf(pasted)).not.to.exist;
  });


  it('should paste a plan item with its criterion, the same in the model and the diagram', function(done) {

    // given
    copy([ 'PI_Task_1' ]);

    // when
    var pasted = paste();

    // then
    var item = byType(pasted, 'cmmn:PlanItem')[0].businessObject,
        criterionShape = byType(pasted, 'cmmn:EntryCriterion')[0],
        criterion = criterionShape.businessObject;

    expect(item.entryCriteria).to.eql([ criterion ]);
    expect(criterion.$parent).to.equal(item);
    expect(criterion.di.cmmnElementRef).to.equal(criterion);
    expect(criterion.sentryRef.id).not.to.equal('Sentry_1');
    expect(plan.businessObject.sentries).to.include(criterion.sentryRef);

    // and the saved model reads back without problems
    inject(function(cmmnjs) {
      cmmnjs.saveXML({ format: true }, function(err, xml) {
        if (err) {
          return done(err);
        }

        cmmnjs.importXML(xml, function(err, warnings) {
          if (err) {
            return done(err);
          }

          try {
            expect(warnings.map(function(w) { return w.message; })).to.eql([]);
            done();
          } catch (e) {
            done(e);
          }
        });
      });
    })();
  });


  it('should undo and redo a pasted criterion with its host and sentry', inject(function(commandStack) {

    // given
    var sentries = plan.businessObject.sentries.slice();

    copy([ 'PI_Task_1' ]);

    var pasted = paste(),
        item = byType(pasted, 'cmmn:PlanItem')[0].businessObject,
        criterion = byType(pasted, 'cmmn:EntryCriterion')[0].businessObject;

    // when
    commandStack.undo();

    // then
    expect(plan.businessObject.planItems).not.to.include(item);
    expect(plan.businessObject.sentries).to.eql(sentries);

    // when
    commandStack.redo();

    // then
    expect(plan.businessObject.planItems).to.include(item);
    expect(item.entryCriteria).to.eql([ criterion ]);
    expect(plan.businessObject.sentries).to.include(criterion.sentryRef);
  }));


  it('should undo a paste in one step', inject(function(commandStack) {

    // given
    copy([ 'PI_Task_1', 'PI_EventListener_1', 'EntryCriterion_1' ]);

    var items = plan.businessObject.planItems.length,
        definitions = plan.businessObject.planItemDefinitions.length;

    paste();

    // when
    commandStack.undo();

    // then
    expect(plan.businessObject.planItems).to.have.length(items);
    expect(plan.businessObject.planItemDefinitions).to.have.length(definitions);
    expect(plan.businessObject.sentries).to.have.length(1);
  }));


  it('should paste a stage with its content', function() {

    // given
    copy([ 'PI_Stage_1' ]);

    // when
    var pasted = paste({ x: 600, y: 350 });

    // then
    var stage = byType(pasted, 'cmmn:PlanItem').filter(function(e) {
      return e.businessObject.definitionRef.$type === 'cmmn:Stage';
    })[0].businessObject.definitionRef;

    expect(stage.id).not.to.equal('Stage_1');
    expect(stage.name).to.equal('Review');
    expect(stage.planItems).to.have.length(1);
    expect(stage.planItems[0].id).not.to.equal('PI_Inner');
    expect(stage.planItems[0].definitionRef.name).to.equal('Check');
    expect(stage.planItemDefinitions).to.include(stage.planItems[0].definitionRef);
  });


  it('should not copy the case plan model', inject(function(copyPaste) {

    // when
    var tree = copyPaste.copy([ plan ]);

    // then
    expect(tree).to.eql({});
  }));


  it('should cut and undo', inject(function(elementRegistry, editorActions, selection, commandStack) {

    // given
    selection.select(elementRegistry.get('PI_EventListener_1'));

    // when
    editorActions.trigger('cut');

    // then
    expect(elementRegistry.get('PI_EventListener_1')).not.to.exist;

    // when
    var pasted = paste();

    // then
    expect(byType(pasted, 'cmmn:PlanItem')[0].businessObject.name).to.equal('Listener');

    // when
    commandStack.undo();
    commandStack.undo();

    // then
    expect(elementRegistry.get('PI_EventListener_1')).to.exist;
  }));


  it('should offer copy, cut and paste as editor actions', inject(function(editorActions) {

    // then
    expect(editorActions.isRegistered('copy')).to.be.true;
    expect(editorActions.isRegistered('cut')).to.be.true;
    expect(editorActions.isRegistered('paste')).to.be.true;
  }));

});
