'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject */

var planItemResizeModule = require('../../../../lib/features/plan-item-resize'),
    canResize = require('../../../../lib/features/plan-item-resize/PlanItemResizeRules').canResize;


describe('features - plan-item-resize', function() {

  var diagramXML = require('../../../fixtures/cmmn/context-pad-tools.cmmn');

  beforeEach(bootstrapModeler(diagramXML, { additionalModules: [ planItemResizeModule ] }));

  function allowed(id, newBounds) {
    var result;

    inject(function(elementRegistry, rules) {
      result = rules.allowed('shape.resize', { shape: elementRegistry.get(id), newBounds: newBounds });
    })();

    return result;
  }


  it('should resize a task down to its smallest size', function() {
    expect(allowed('PI_Task_1')).to.be.true;
    expect(allowed('PI_Task_1', { x: 400, y: 100, width: 160, height: 90 })).to.be.true;
    expect(allowed('PI_Task_1', { x: 400, y: 100, width: 40, height: 90 })).to.be.false;
  });


  it('should resize a milestone down to its smallest size', function() {
    expect(allowed('PI_Milestone_1', { x: 600, y: 120, width: 140, height: 30 })).to.be.true;
    expect(allowed('PI_Milestone_1', { x: 600, y: 120, width: 140, height: 20 })).to.be.false;
  });


  it('should leave stages and event listeners to cmmn-js', function() {
    expect(allowed('PI_Stage_1')).to.be.true;
    expect(allowed('PI_Listener_1')).to.be.false;
  });


  it('should resize a task through modeling', inject(function(elementRegistry, modeling) {

    // given
    var task = elementRegistry.get('PI_Task_1');

    // when
    modeling.resizeShape(task, { x: 400, y: 100, width: 160, height: 100 });

    // then
    expect(task.width).to.equal(160);
    expect(task.businessObject.di.bounds.width).to.equal(160);
  }));


  describe('canResize', function() {

    function planItem(type) {
      return {
        businessObject: {
          definitionRef: {
            $instanceOf: function(t) {
              return t === type || (t === 'cmmn:Task' && type === 'cmmn:HumanTask');
            }
          }
        }
      };
    }

    it('should know tasks and milestones only', function() {
      expect(canResize(planItem('cmmn:HumanTask'))).to.be.true;
      expect(canResize(planItem('cmmn:Milestone'), { width: 100, height: 30 })).to.be.true;
      expect(canResize(planItem('cmmn:Stage'))).to.be.undefined;
      expect(canResize({})).to.be.undefined;
      expect(canResize({ labelTarget: {}, businessObject: planItem('cmmn:HumanTask').businessObject })).to.be.undefined;
    });

  });

});
