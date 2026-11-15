'use strict';

var Modeler = require('../../../lib/Modeler'),
    Viewer = require('../../../lib/Viewer');

var TestContainer = require('mocha-test-container-support');

var CMMNDI_NS = 'http://www.omg.org/spec/CMMN/20151109/CMMNDI',
    DI_NS = 'http://www.omg.org/spec/CMMN/20151109/DI';


describe('import - edges in Flowable\'s form', function() {

  var xml = require('./Importer.flowable-edges.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });


  /**
   * The saved edges by ID: { cmmnElementRef, targetCMMNElementRef, waypoints }.
   */
  function parseEdges(savedXML) {
    var doc = new DOMParser().parseFromString(savedXML, 'application/xml');

    var edges = {};

    var elements = doc.getElementsByTagNameNS(CMMNDI_NS, 'CMMNEdge');

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i],
          waypoints = element.getElementsByTagNameNS(DI_NS, 'waypoint');

      var points = [];

      for (var j = 0; j < waypoints.length; j++) {
        points.push([
          Number(waypoints[j].getAttribute('x')),
          Number(waypoints[j].getAttribute('y'))
        ]);
      }

      edges[element.getAttribute('id')] = {
        cmmnElementRef: element.getAttribute('cmmnElementRef'),
        targetCMMNElementRef: element.getAttribute('targetCMMNElementRef'),
        waypoints: points
      };
    }

    return edges;
  }

  function save(modeler, done) {
    modeler.saveXML({ format: true }, function(err, savedXML) {
      if (err) {
        return done(err);
      }

      done(null, parseEdges(savedXML), savedXML);
    });
  }

  function importInto(DiagramType, done) {
    var diagram = new DiagramType({ container: container });

    diagram.importXML(xml, function(err, warnings) {
      done(err, diagram, warnings);
    });
  }


  describe('import', function() {

    var modeler, warnings, elementRegistry;

    beforeEach(function(done) {
      importInto(Modeler, function(err, diagram, importWarnings) {
        modeler = diagram;
        warnings = importWarnings;
        elementRegistry = modeler.get('elementRegistry');

        done(err);
      });
    });


    it('should warn only about an edge without a matching on-part', function() {

      // then
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.contain('no source referenced in <cmmndi:CMMNEdge id="E_Unmatched" />');
      expect(elementRegistry.get('E_Unmatched')).not.to.exist;
    });


    [
      [ 'E_AB', 'OP_AB', 'EC_B', 'plan item to entry criterion' ],
      [ 'E_AC', 'OP_AC', 'EC_C', 'entry criterion to plan item' ],
      [ 'E_AD', 'OP_AD', 'XC_D', 'plan item to exit criterion' ],
      [ 'E_AE', 'OP_AE', 'XC_E', 'exit criterion to plan item' ],
      [ 'E_AF', 'OP_AF', 'EC_F', 'on-part (CMMN form)' ]
    ].forEach(function(spec) {

      var edgeId = spec[0], onPartId = spec[1], criterionId = spec[2], title = spec[3];

      it('should draw ' + title + ' as the connector of its on-part', function() {

        // when
        var connection = elementRegistry.get(edgeId);

        // then
        expect(connection).to.exist;
        expect(connection.source).to.equal(elementRegistry.get('PI_A'));
        expect(connection.target).to.equal(elementRegistry.get(criterionId));
        expect(connection.businessObject.cmmnElementRef.id).to.equal(onPartId);
        expect(connection.businessObject.targetCMMNElementRef.id).to.equal(criterionId);

        // waypoints run from the source to the target
        expect(connection.waypoints[0]).to.include({ x: 197, y: 338 });
      });

    });


    it('should import in the viewer', function(done) {

      importInto(Viewer, function(err, viewer, viewerWarnings) {

        // then
        expect(viewerWarnings).to.have.length(1);
        expect(viewer.get('elementRegistry').get('E_AC').source)
          .to.equal(viewer.get('elementRegistry').get('PI_A'));

        done(err);
      });
    });

  });


  describe('save', function() {

    var modeler;

    beforeEach(function(done) {
      importInto(Modeler, function(err, diagram) {
        modeler = diagram;
        done(err);
      });
    });


    it('should keep the form each edge was read in', function(done) {

      save(modeler, function(err, edges) {

        // then
        expect(edges.E_AB).to.eql({
          cmmnElementRef: 'PI_A',
          targetCMMNElementRef: 'EC_B',
          waypoints: [ [ 197, 338 ], [ 390, 88 ] ]
        });

        expect(edges.E_AC).to.eql({
          cmmnElementRef: 'EC_C',
          targetCMMNElementRef: 'PI_A',
          waypoints: [ [ 390, 238 ], [ 197, 338 ] ]
        });

        expect(edges.E_AD).to.eql({
          cmmnElementRef: 'PI_A',
          targetCMMNElementRef: 'XC_D',
          waypoints: [ [ 197, 338 ], [ 390, 388 ] ]
        });

        expect(edges.E_AE).to.eql({
          cmmnElementRef: 'XC_E',
          targetCMMNElementRef: 'PI_A',
          waypoints: [ [ 390, 538 ], [ 197, 338 ] ]
        });

        expect(edges.E_AF).to.eql({
          cmmnElementRef: 'OP_AF',
          targetCMMNElementRef: 'EC_F',
          waypoints: [ [ 197, 338 ], [ 640, 338 ] ]
        });

        expect(edges.E_Unmatched).to.eql({
          cmmnElementRef: 'PI_B',
          targetCMMNElementRef: 'EC_C',
          waypoints: [ [ 497, 88 ], [ 390, 238 ] ]
        });

        done(err);
      });
    });


    it('should keep working with the on-parts after saving', function(done) {

      var elementRegistry = modeler.get('elementRegistry');

      save(modeler, function(err) {

        // then
        var edge = elementRegistry.get('E_AC').businessObject;

        expect(edge.cmmnElementRef.id).to.equal('OP_AC');
        expect(edge.targetCMMNElementRef.id).to.equal('EC_C');
        expect(edge.waypoint[0]).to.include({ x: 197, y: 338 });

        done(err);
      });
    });


    it('should save the same XML twice', function(done) {

      save(modeler, function(err, edges, firstXML) {

        if (err) {
          return done(err);
        }

        save(modeler, function(err, edges, secondXML) {

          // then
          expect(secondXML).to.equal(firstXML);

          done(err);
        });
      });
    });

  });


  describe('edit', function() {

    var modeler, elementRegistry, modeling;

    beforeEach(function(done) {
      importInto(Modeler, function(err, diagram) {
        modeler = diagram;
        elementRegistry = modeler.get('elementRegistry');
        modeling = modeler.get('modeling');

        done(err);
      });
    });


    it('should save updated waypoints in the form read', function(done) {

      // when
      modeling.moveElements([ elementRegistry.get('PI_A') ], { x: 0, y: 40 });

      save(modeler, function(err, edges) {

        // then
        var waypoints = edges.E_AC.waypoints;

        expect(edges.E_AC.cmmnElementRef).to.equal('EC_C');
        expect(edges.E_AC.targetCMMNElementRef).to.equal('PI_A');

        // from the criterion to the moved plan item
        expect(waypoints[0][0]).to.be.within(390, 410);
        expect(waypoints[waypoints.length - 1][0]).to.be.within(100, 197);
        expect(waypoints[waypoints.length - 1][1]).to.be.within(340, 416);

        done(err);
      });
    });


    it('should save a reconnected source in the form read', function(done) {

      // given
      var connection = elementRegistry.get('E_AB'),
          newSource = elementRegistry.get('PI_D');

      // when
      modeling.reconnectStart(connection, newSource, [
        { x: 448, y: 350 },
        connection.waypoints[connection.waypoints.length - 1]
      ]);

      save(modeler, function(err, edges) {

        // then
        expect(edges.E_AB.cmmnElementRef).to.equal('PI_D');
        expect(edges.E_AB.targetCMMNElementRef).to.equal('EC_B');

        done(err);
      });
    });


    it('should save a new connector in Flowable\'s form', function(done) {

      // when
      var connection = modeling.connect(
        elementRegistry.get('PI_C'),
        elementRegistry.get('EC_F'),
        { type: 'cmmn:PlanItemOnPart' }
      );

      save(modeler, function(err, edges) {

        // then
        var edge = edges[connection.id];

        expect(connection.businessObject.cmmnElementRef.sourceRef.id).to.equal('PI_C');

        expect(edge.cmmnElementRef).to.equal('PI_C');
        expect(edge.targetCMMNElementRef).to.equal('EC_F');

        done(err);
      });
    });


    it('should save a new connector from an exit criterion in the CMMN form', function(done) {

      // when
      var connection = modeling.connect(
        elementRegistry.get('XC_D'),
        elementRegistry.get('EC_F'),
        { type: 'cmmn:PlanItemOnPart' }
      );

      save(modeler, function(err, edges) {

        // then
        var onPart = connection.businessObject.cmmnElementRef,
            edge = edges[connection.id];

        expect(onPart.exitCriterionRef.id).to.equal('XC_D');

        // Flowable's form has no place for the exit criterion
        expect(edge.cmmnElementRef).to.equal(onPart.id);
        expect(edge.targetCMMNElementRef).to.equal('EC_F');

        done(err);
      });
    });


    it('should not save an undone connector', function(done) {

      // given
      var connection = modeling.connect(
        elementRegistry.get('PI_C'),
        elementRegistry.get('EC_F'),
        { type: 'cmmn:PlanItemOnPart' }
      );

      // when
      modeler.get('commandStack').undo();

      save(modeler, function(err, edges) {

        // then
        expect(edges[connection.id]).not.to.exist;

        done(err);
      });
    });

  });

});
