'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject, sinon */

var paletteToggleModule = require('../../../../lib/features/palette-toggle');


describe('features - palette-toggle', function() {

  var diagramXML = require('../../../fixtures/cmmn/context-pad-tools.cmmn');

  function click(button) {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }


  describe('on its own', function() {

    beforeEach(bootstrapModeler(diagramXML, { additionalModules: [ paletteToggleModule ] }));


    it('should put its button next to the canvas\'s container', inject(function(paletteToggle, canvas) {

      // then
      var button = paletteToggle.button,
          container = canvas.getContainer();

      expect(button.parentNode).to.equal(container.parentNode);
      expect(button.getAttribute('aria-expanded')).to.equal('true');
      expect(button.getAttribute('aria-label')).to.equal('Collapse the tools');
      expect(container.classList.contains('cjs-palette-toggle-on')).to.be.true;
    }));


    it('should collapse and show the palette', inject(function(paletteToggle, palette, canvas, eventBus) {

      // given
      var changed = sinon.spy();

      eventBus.on('paletteToggle.changed', changed);

      // when
      click(paletteToggle.button);

      // then
      expect(palette.isOpen()).to.be.false;
      expect(paletteToggle.isOpen()).to.be.false;
      expect(paletteToggle.button.getAttribute('aria-expanded')).to.equal('false');
      expect(paletteToggle.button.textContent).to.equal('›');
      expect(canvas.getContainer().classList.contains('cjs-palette-collapsed')).to.be.true;
      expect(changed).to.have.been.calledOnce;
      expect(changed.args[0][0].open).to.be.false;

      // when
      click(paletteToggle.button);

      // then
      expect(palette.isOpen()).to.be.true;
      expect(canvas.getContainer().classList.contains('cjs-palette-collapsed')).to.be.false;
    }));


    it('should keep the palette collapsed when diagram-js opens it again', inject(function(paletteToggle, palette) {

      // given
      paletteToggle.set(false);

      // when
      palette.open();

      // then
      expect(palette.isOpen()).to.be.false;
    }));


    it('should leave room for the button when the palette decides on two columns', inject(function(paletteToggle, palette) {

      // given
      var bar = paletteToggle.button.offsetHeight + 6;

      // then
      expect(palette._needsCollapse(10000, {})).to.be.false;
      expect(bar).to.be.above(6);
    }));


    it('should remove its button with the modeler', inject(function(paletteToggle, eventBus) {

      // given
      var button = paletteToggle.button;

      // when
      eventBus.fire('diagram.destroy');

      // then
      expect(button.parentNode).not.to.exist;
    }));

  });


  describe('with a host', function() {

    var asked = [];

    beforeEach(function() {
      asked = [];
    });

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ paletteToggleModule ],
      paletteToggle: {
        open: false,
        labels: { collapse: 'Hide', show: 'Show' },
        onToggle: function(open) {
          asked.push(open);
        }
      }
    }));


    it('should start collapsed, and ask the host for the other state', inject(function(paletteToggle, palette) {

      // then
      expect(palette.isOpen()).to.be.false;
      expect(paletteToggle.button.getAttribute('aria-label')).to.equal('Show');

      // when
      click(paletteToggle.button);

      // then
      expect(asked).to.eql([ true ]);
      expect(palette.isOpen()).to.be.false;
    }));

  });

});
