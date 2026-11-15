'use strict';

/* global Promise */

var Modeler = require('../../../lib/Modeler'),
    Viewer = require('../../../lib/Viewer');

var TestContainer = require('mocha-test-container-support');


describe('import - model without a diagram', function() {

  var xml = require('./Importer.no-diagram.cmmn'),
      emptyCmmndiXML = require('./Importer.no-diagram-empty-cmmndi.cmmn'),
      emptyDefinitionsXML = require('../../fixtures/cmmn/empty-definitions.cmmn'),
      diagramXML = require('../../fixtures/cmmn/simple.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });


  function importXML(diagram, xml) {
    return new Promise(function(resolve, reject) {
      diagram.importXML(xml, function(err, warnings) {
        return err ? reject(err) : resolve(warnings);
      });
    });
  }

  function saveXML(diagram) {
    return new Promise(function(resolve, reject) {
      diagram.saveXML({ format: true }, function(err, xml) {
        return err ? reject(err) : resolve(xml);
      });
    });
  }

  function messages(warnings) {
    return warnings.map(function(warning) {
      return warning.message;
    });
  }


  describe('import', function() {

    it('should draw on an empty diagram and warn', function() {

      var modeler = new Modeler({ container: container });

      return importXML(modeler, xml).then(function(warnings) {

        // then
        var root = modeler.get('canvas').getRootElement();

        expect(messages(warnings)).to.eql([
          'no diagram to display; the elements of <cmmn:Definitions id="Test" /> are not shown'
        ]);

        expect(root.businessObject.$type).to.equal('cmmndi:CMMNDiagram');
        expect(modeler.get('elementRegistry').get('PI_Task_1')).not.to.exist;
      });
    });


    it('should not warn about empty definitions', function() {

      var modeler = new Modeler({ container: container });

      return importXML(modeler, emptyDefinitionsXML).then(function(warnings) {

        // then
        expect(warnings).to.be.empty;
        expect(modeler.get('canvas').getRootElement().businessObject.$type)
          .to.equal('cmmndi:CMMNDiagram');
      });
    });


    it('should draw on an empty diagram in an empty CMMNDI', function() {

      var modeler = new Modeler({ container: container });

      return importXML(modeler, emptyCmmndiXML).then(function(warnings) {

        // then
        expect(messages(warnings)).to.have.length(1);
        expect(modeler.get('canvas').getRootElement().businessObject.$type)
          .to.equal('cmmndi:CMMNDiagram');
      });
    });


    it('should import in the viewer', function() {

      var viewer = new Viewer({ container: container });

      return importXML(viewer, xml).then(function(warnings) {

        // then
        expect(messages(warnings)).to.have.length(1);
        expect(viewer.get('canvas').getRootElement().businessObject.$type)
          .to.equal('cmmndi:CMMNDiagram');
      });
    });


    it('should import another model afterwards', function() {

      var modeler = new Modeler({ container: container });

      return importXML(modeler, xml).then(function() {
        return importXML(modeler, diagramXML);
      }).then(function(warnings) {

        // then
        expect(warnings).to.be.empty;
        expect(modeler.get('canvas').getRootElement().businessObject.$type)
          .to.equal('cmmndi:CMMNDiagram');
        expect(modeler.get('elementRegistry').getAll().length).to.be.above(1);
      });
    });

  });


  describe('save', function() {

    var modeler;

    beforeEach(function() {
      modeler = new Modeler({ container: container });

      return importXML(modeler, xml);
    });


    it('should keep the model without a diagram', function() {

      return saveXML(modeler).then(function(savedXML) {

        // then
        expect(savedXML).not.to.contain('CMMNDI');
        expect(savedXML).to.contain('<cmmn:planItem id="PI_Task_1" definitionRef="Task_1" />');
      });
    });


    it('should keep the diagram after saving', function() {

      return saveXML(modeler).then(function() {

        // then
        var definitions = modeler.getDefinitions();

        expect(definitions.CMMNDI.diagrams).to.have.length(1);
        expect(definitions.CMMNDI.diagrams[0])
          .to.equal(modeler.get('canvas').getRootElement().businessObject);
      });
    });


    it('should save what is drawn', function() {

      // given
      var shape = modeler.get('elementFactory').createCasePlanModelShape();

      // when
      modeler.get('modeling').createShape(shape, { x: 300, y: 200 }, modeler.get('canvas').getRootElement());

      return saveXML(modeler).then(function(savedXML) {

        // then
        var definitions = modeler.getDefinitions(),
            diagramId = definitions.CMMNDI.diagrams[0].id;

        expect(savedXML).to.contain('<cmmndi:CMMNDiagram id="' + diagramId + '">');
        expect(savedXML).to.contain('cmmnElementRef="' + shape.businessObject.id + '"');
        expect(savedXML).to.contain('<cmmn:planItem id="PI_Task_1" definitionRef="Task_1" />');
      });
    });


    it('should leave the diagram out again after undo', function() {

      // given
      var shape = modeler.get('elementFactory').createCasePlanModelShape();

      modeler.get('modeling').createShape(shape, { x: 300, y: 200 }, modeler.get('canvas').getRootElement());

      // when
      modeler.get('commandStack').undo();

      return saveXML(modeler).then(function(savedXML) {

        // then
        expect(savedXML).not.to.contain('CMMNDI');
      });
    });


    it('should keep an empty CMMNDI', function() {

      return importXML(modeler, emptyCmmndiXML).then(function() {
        return saveXML(modeler);
      }).then(function(savedXML) {

        // then
        expect(savedXML).to.contain('<cmmndi:CMMNDI />');
        expect(savedXML).not.to.contain('CMMNDiagram');
      });
    });

  });

});
