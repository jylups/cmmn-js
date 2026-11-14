'use strict';

require('../../../TestHelper');

var coreModule = require('../../../../lib/core'),
    selectionModule = require('diagram-js/lib/features/selection').default,
    outlineModule = require('../../../../lib/features/outline');

var domQuery = require('min-dom').query;

/* global bootstrapModeler, inject */


describe('features - outline', function() {

  var diagramXML = require('../../../fixtures/cmmn/simple.cmmn');

  var testModules = [ coreModule, selectionModule, outlineModule ];

  beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));


  it('should fit case plan model height', inject(function(outline, elementRegistry, selection) {

    // given
    var casePlanModel = elementRegistry.get('CasePlanModel_1');

    // when
    selection.select(casePlanModel);

    // then
    var gfx = elementRegistry.getGraphics(casePlanModel);

    var outlineBBox = domQuery('.djs-outline', gfx).getBBox();

    // the outline includes the case plan model's 18px high tab
    expect(outlineBBox.y).to.equal(-outline.offset - 18);
    expect(outlineBBox.height).to.equal(casePlanModel.height + 18 + outline.offset * 2);
  }));

});
