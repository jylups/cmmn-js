'use strict';

var Modeler = require('../../../lib/Modeler');

var TestContainer = require('mocha-test-container-support');

var MODEL_NS = 'http://www.omg.org/spec/CMMN/20151109/MODEL',
    FLOWABLE_NS = 'http://flowable.org/cmmn';

/**
 * A minimal Flowable package: with it, moddle reports flowable:sentryRef as an
 * unknown attribute of a known namespace, as with flowable-cmmn-moddle.
 */
var flowablePackage = {
  name: 'Flowable',
  uri: FLOWABLE_NS,
  prefix: 'flowable',
  xml: { tagAlias: 'lowerCase' },
  types: []
};


describe('import - criteria with flowable:sentryRef', function() {

  var xml = require('./Importer.flowable-sentry-ref.cmmn');

  var container;

  beforeEach(function() {
    container = TestContainer.get(this);
  });


  /**
   * The saved criteria by ID: { sentryRef, flowableSentryRef }.
   */
  function parseCriteria(savedXML) {
    var doc = new DOMParser().parseFromString(savedXML, 'application/xml');

    var criteria = {};

    [ 'entryCriterion', 'exitCriterion' ].forEach(function(name) {
      var elements = doc.getElementsByTagNameNS(MODEL_NS, name);

      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];

        criteria[element.getAttribute('id')] = {
          sentryRef: element.getAttribute('sentryRef'),
          flowableSentryRef: element.getAttributeNS(FLOWABLE_NS, 'sentryRef')
        };
      }
    });

    return criteria;
  }

  function save(modeler, done) {
    modeler.saveXML({ format: true }, function(err, savedXML) {
      if (err) {
        return done(err);
      }

      done(null, parseCriteria(savedXML), savedXML);
    });
  }


  [
    [ 'without a Flowable package', {} ],
    [ 'with a Flowable package', { moddleExtensions: { flowable: flowablePackage } } ]
  ].forEach(function(spec) {

    var title = spec[0], options = spec[1];

    describe(title, function() {

      var modeler, warnings, elementRegistry;

      beforeEach(function(done) {
        modeler = new Modeler(Object.assign({ container: container }, options));

        modeler.importXML(xml, function(err, importWarnings) {
          warnings = importWarnings;
          elementRegistry = modeler.get('elementRegistry');

          done(err);
        });
      });


      describe('import', function() {

        it('should use the sentry referenced by flowable:sentryRef', function() {

          // then
          expect(elementRegistry.get('EC_B').businessObject.sentryRef.id).to.equal('S_B');
          expect(elementRegistry.get('XC_D').businessObject.sentryRef.id).to.equal('S_D');
          expect(elementRegistry.get('EC_G').businessObject.sentryRef.id).to.equal('S_G');
        });


        it('should keep a flowable:sentryRef to a missing sentry', function() {

          // then
          var criterion = elementRegistry.get('EC_H').businessObject;

          expect(criterion.sentryRef).not.to.exist;
          expect(criterion.$attrs['flowable:sentryRef']).to.equal('S_Missing');
        });


        it('should draw the connectors of the criteria', function() {

          // then
          expect(warnings.filter(function(warning) {
            return /no source referenced/.test(warning.message);
          })).to.be.empty;

          expect(elementRegistry.get('E_AB').target).to.equal(elementRegistry.get('EC_B'));
          expect(elementRegistry.get('E_AD').target).to.equal(elementRegistry.get('XC_D'));
          expect(elementRegistry.get('E_AG').target).to.equal(elementRegistry.get('EC_G'));
        });

      });


      describe('save', function() {

        it('should keep the attribute each criterion was read with', function(done) {

          save(modeler, function(err, criteria) {

            // then
            expect(criteria.EC_B).to.eql({ sentryRef: null, flowableSentryRef: 'S_B' });
            expect(criteria.XC_D).to.eql({ sentryRef: null, flowableSentryRef: 'S_D' });
            expect(criteria.EC_G).to.eql({ sentryRef: 'S_G', flowableSentryRef: null });
            expect(criteria.EC_H).to.eql({ sentryRef: null, flowableSentryRef: 'S_Missing' });

            done(err);
          });
        });


        it('should keep working with sentryRef after saving', function(done) {

          save(modeler, function(err) {

            // then
            var criterion = elementRegistry.get('EC_B').businessObject;

            expect(criterion.sentryRef.id).to.equal('S_B');
            expect(criterion.$attrs['flowable:sentryRef']).not.to.exist;

            done(err);
          });
        });


        it('should save the same XML twice', function(done) {

          save(modeler, function(err, criteria, firstXML) {

            if (err) {
              return done(err);
            }

            save(modeler, function(err, criteria, secondXML) {

              // then
              expect(secondXML).to.equal(firstXML);

              done(err);
            });
          });
        });


        it('should save a changed sentry as flowable:sentryRef', function(done) {

          // given
          var sentry = elementRegistry.get('XC_D').businessObject.sentryRef;

          // when
          modeler.get('modeling').updateProperties(elementRegistry.get('EC_B'), {
            sentryRef: sentry
          });

          save(modeler, function(err, criteria) {

            // then
            expect(criteria.EC_B).to.eql({ sentryRef: null, flowableSentryRef: 'S_D' });

            done(err);
          });
        });

      });

    });

  });

});
