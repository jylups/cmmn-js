'use strict';

require('../../../TestHelper');

/* global bootstrapModeler, inject, sinon */

var Modeler = require('../../../../lib/Modeler'),
    touchModule = require('../../../../lib/features/touch');


describe('features - touch', function() {

  var diagramXML = require('../../../fixtures/cmmn/simple.cmmn');

  var nextId = 1;

  /**
   * A touch screen: the module turns itself on only where (pointer: coarse)
   * matches, which a desktop browser doesn't.
   */
  function fakeTouchScreen() {
    var matchMedia = window.matchMedia;

    sinon.stub(window, 'matchMedia').callsFake(function(query) {
      if (query === '(pointer: coarse)') {
        return {
          matches: true,
          media: query,
          addListener: function() {},
          removeListener: function() {},
          addEventListener: function() {},
          removeEventListener: function() {}
        };
      }

      return matchMedia.call(window, query);
    });
  }

  function point(element) {
    var box = element.getBoundingClientRect();

    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  function createTouch(target, position, id) {
    return new Touch({
      identifier: id,
      target: target,
      clientX: position.x,
      clientY: position.y,
      pageX: position.x,
      pageY: position.y,
      screenX: position.x,
      screenY: position.y
    });
  }

  function fire(target, type, touches, changed) {
    target.dispatchEvent(new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: touches,
      targetTouches: touches,
      changedTouches: changed || touches
    }));
  }

  /** A finger that goes down on target, moves in steps, and lifts. */
  function finger(target, start) {
    var id = nextId++,
        position = start,
        current = createTouch(target, position, id);

    fire(target, 'touchstart', [ current ]);

    return {
      touch: function() {
        return current;
      },
      moveBy: function(dx, dy, steps, others) {
        steps = steps || 5;

        var from = position;

        for (var i = 1; i <= steps; i++) {
          position = { x: from.x + dx * i / steps, y: from.y + dy * i / steps };
          current = createTouch(target, position, id);

          var all = [ current ].concat((others || []).map(function(other) { return other.touch(); }));

          fire(target, 'touchmove', all, [ current ]);
        }
      },
      lift: function(others) {
        var rest = (others || []).map(function(other) { return other.touch(); });

        fire(target, 'touchend', rest, [ current ]);
      }
    };
  }

  function tap(target) {
    finger(target, point(target)).lift();
  }

  function hit(elementRegistry, id) {
    return elementRegistry.getGraphics(id).querySelector('.djs-hit');
  }


  describe('on a touch screen', function() {

    beforeEach(function() {
      fakeTouchScreen();
    });

    afterEach(function() {
      window.matchMedia.restore();
    });

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ touchModule ]
    }));


    it('should select a shape with a tap', inject(function(elementRegistry, selection) {

      // when
      tap(hit(elementRegistry, 'PI_Task_1'));

      // then
      expect(selection.get()).to.eql([ elementRegistry.get('PI_Task_1') ]);
    }));


    it('should move a shape with a drag', inject(function(elementRegistry) {

      // given
      var task = elementRegistry.get('PI_Task_1'),
          x = task.x,
          y = task.y,
          target = hit(elementRegistry, 'PI_Task_1');

      // when
      var touch = finger(target, point(target));
      touch.moveBy(60, 40, 10);
      touch.lift();

      // then
      expect(task.x).to.be.closeTo(x + 60, 2);
      expect(task.y).to.be.closeTo(y + 40, 2);
    }));


    it('should pan the canvas with one finger on empty space', inject(function(canvas) {

      // given
      var svg = canvas._svg,
          box = svg.getBoundingClientRect(),
          before = canvas.viewbox();

      // when
      var touch = finger(svg, { x: box.right - 20, y: box.bottom - 20 });
      touch.moveBy(-80, -50, 10);
      touch.lift();

      // then
      var after = canvas.viewbox();

      expect(after.x - before.x).to.be.closeTo(80, 2);
      expect(after.y - before.y).to.be.closeTo(50, 2);
    }));


    it('should zoom with a pinch', inject(function(canvas) {

      // given
      var svg = canvas._svg,
          box = svg.getBoundingClientRect(),
          centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 },
          zoom = canvas.zoom();

      // when: two fingers move apart
      var first = finger(svg, { x: centre.x - 40, y: centre.y });

      var second = (function() {
        var id = nextId++,
            position = { x: centre.x + 40, y: centre.y },
            current = createTouch(svg, position, id);

        fire(svg, 'touchstart', [ first.touch(), current ], [ current ]);

        return {
          touch: function() {
            return current;
          },
          moveBy: function(dx) {
            for (var i = 1; i <= 5; i++) {
              current = createTouch(svg, { x: position.x + dx * i / 5, y: position.y }, id);
              fire(svg, 'touchmove', [ first.touch(), current ], [ current ]);
            }
          },
          lift: function(others) {
            fire(svg, 'touchend', others.map(function(other) { return other.touch(); }), [ current ]);
          }
        };
      }());

      second.moveBy(80);
      second.lift([ first ]);
      first.lift();

      // then
      expect(canvas.zoom()).to.be.above(zoom * 1.2);
    }));


    it('should pan with two fingers, also on a shape', inject(function(canvas, elementRegistry) {

      // given: two fingers down on a task
      var svg = canvas._svg,
          target = hit(elementRegistry, 'PI_Task_1'),
          centre = point(target),
          task = elementRegistry.get('PI_Task_1'),
          x = task.x,
          y = task.y,
          zoom = canvas.zoom(),
          before = canvas.viewbox();

      var ids = [ nextId++, nextId++ ],
          starts = [ { x: centre.x - 20, y: centre.y }, { x: centre.x + 20, y: centre.y } ];

      function touches(dx, dy) {
        return starts.map(function(start, i) {
          return createTouch(target, { x: start.x + dx, y: start.y + dy }, ids[i]);
        });
      }

      fire(target, 'touchstart', touches(0, 0).slice(0, 1));
      fire(target, 'touchstart', touches(0, 0), touches(0, 0).slice(1));

      // when: both move together
      for (var i = 1; i <= 5; i++) {
        fire(target, 'touchmove', touches(-80 * i / 5, -50 * i / 5));
      }

      var last = touches(-80, -50);

      fire(target, 'touchend', last.slice(0, 1), last.slice(1));
      fire(target, 'touchend', [], last.slice(0, 1));

      // then: the diagram moved under the fingers; the task and the zoom stayed
      var after = canvas.viewbox();

      expect(canvas.zoom()).to.be.closeTo(zoom, 0.001);
      expect((after.x - before.x) * zoom).to.be.closeTo(80, 2);
      expect((after.y - before.y) * zoom).to.be.closeTo(50, 2);
      expect(task.x).to.equal(x);
      expect(task.y).to.equal(y);

      expect(svg).to.exist;
    }));


    it('should edit a label with a double tap', inject(function(elementRegistry, directEditing) {

      // given
      var target = hit(elementRegistry, 'PI_Task_1');

      // when
      tap(target);
      tap(target);

      // then
      expect(directEditing.isActive()).to.be.true;
      expect(directEditing._active.element).to.equal(elementRegistry.get('PI_Task_1'));
    }));


    it('should finish a label edit with a tap on the canvas', inject(function(canvas, elementRegistry, directEditing) {

      // given
      var target = hit(elementRegistry, 'PI_Task_1');

      tap(target);
      tap(target);

      expect(directEditing.isActive()).to.be.true;

      // when
      var svg = canvas._svg,
          box = svg.getBoundingClientRect();

      finger(svg, { x: box.right - 20, y: box.bottom - 20 }).lift();

      // then
      expect(directEditing.isActive()).to.be.false;
    }));



    describe('palette menus', function() {

      /** Where a point of the diagram is on the screen. */
      function clientPoint(canvas, x, y) {
        var box = canvas._svg.getBoundingClientRect(),
            viewbox = canvas.viewbox();

        return {
          x: box.left + (x - viewbox.x) * viewbox.scale,
          y: box.top + (y - viewbox.y) * viewbox.scale
        };
      }

      function tapAt(position) {
        finger(document.elementFromPoint(position.x, position.y), position).lift();
      }

      function openTasks(canvas) {
        canvas._container.scrollIntoView();

        tap(canvas._container.querySelector('.djs-palette [data-action="create.tasks"]'));
      }

      function menuEntry(id) {
        return document.querySelector('.djs-popup [data-id="' + id + '"]');
      }

      function milestones(elementRegistry) {
        return elementRegistry.filter(function(element) {
          return element.businessObject.definitionRef &&
            element.businessObject.definitionRef.$type === 'cmmn:Milestone';
        });
      }


      it('should open a group menu with a tap', inject(function(canvas, popupMenu) {

        // when
        openTasks(canvas);

        // then
        expect(popupMenu.isOpen()).to.be.true;
        expect(menuEntry('create-milestone')).to.exist;
      }));


      it('should place an item: tap it, then tap the canvas', inject(
        function(canvas, popupMenu, elementRegistry, dragging) {

          // given
          openTasks(canvas);

          // when
          tap(menuEntry('create-milestone'));

          // then: the menu closes and the milestone follows the next touch
          expect(popupMenu.isOpen()).to.be.false;
          expect(dragging.context()).to.exist;

          // when
          tapAt(clientPoint(canvas, 380, 230));

          // then
          var created = milestones(elementRegistry);

          expect(created).to.have.length(1);
          expect(created[0].parent.id).to.equal('CasePlanModel_1');
          expect(dragging.context()).not.to.exist;
        }
      ));


      it('should create an item dragged from the menu', inject(
        function(canvas, popupMenu, elementRegistry, dragging) {

          // given
          openTasks(canvas);

          var entry = menuEntry('create-milestone'),
              start = point(entry),
              end = clientPoint(canvas, 380, 230);

          // when
          var touch = finger(entry, start);
          touch.moveBy(end.x - start.x, end.y - start.y, 10);
          touch.lift();

          // then
          expect(milestones(elementRegistry)).to.have.length(1);
          expect(dragging.context()).not.to.exist;
          expect(popupMenu.isOpen()).to.be.false;
        }
      ));


      it('should finish a drag from the menu while the canvas scrolls', inject(
        function(canvas, popupMenu, elementRegistry, dragging, selection) {

          // given: a selected shape, whose context pad closes as the drag starts
          selection.select(elementRegistry.get('PI_Task_1'));

          openTasks(canvas);

          var entry = menuEntry('create-milestone'),
              start = point(entry),
              end = clientPoint(canvas, 380, 230);

          // when: the canvas scrolls under the drag, as near its edge
          var touch = finger(entry, start);
          touch.moveBy((end.x - start.x) / 2, (end.y - start.y) / 2, 5);

          canvas.scroll({ dx: -10, dy: 0 });

          touch.moveBy((end.x - start.x) / 2, (end.y - start.y) / 2, 5);
          touch.lift();

          // then: the menu stayed for the drag, which ended with a milestone
          expect(milestones(elementRegistry)).to.have.length(1);
          expect(dragging.context()).not.to.exist;
          expect(popupMenu.isOpen()).to.be.false;
        }
      ));


      it('should scroll a long menu, not create, with a drag up or down', inject(
        function(canvas, popupMenu, elementRegistry, dragging) {

          // given: a list longer than the menu
          openTasks(canvas);

          var list = document.querySelector('.djs-popup .djs-popup-results');
          list.style.maxHeight = '80px';
          list.scrollTop = 0;

          var entry = menuEntry('create-human-task');

          // when
          var touch = finger(entry, point(entry));
          touch.moveBy(2, -40, 5);
          touch.lift();

          // then
          expect(dragging.context()).not.to.exist;
          expect(elementRegistry.filter(function(element) {
            return element.type === 'cmmn:PlanItem';
          })).to.have.length(2);
          expect(popupMenu.isOpen()).to.be.true;
          expect(list.scrollTop).to.be.above(0);
        }
      ));


      it('should create from a short menu with a drag down', inject(
        function(canvas, elementRegistry, dragging) {

          // given: the two entries of the containers menu
          canvas._container.scrollIntoView();
          tap(canvas._container.querySelector('.djs-palette [data-action="create.containers"]'));

          var entry = menuEntry('create-stage'),
              start = point(entry),
              end = { x: start.x + 10, y: start.y + 60 };

          // when
          var touch = finger(entry, start);
          touch.moveBy(end.x - start.x, end.y - start.y, 10);

          // then: the stage follows the finger
          expect(dragging.context()).to.exist;
          expect(dragging.context().prefix).to.equal('create');

          dragging.cancel();
        }
      ));


      it('should close an open menu with a tap on the canvas', inject(function(canvas, popupMenu) {

        // given
        openTasks(canvas);

        // when
        tapAt(clientPoint(canvas, 380, 240));

        // then
        expect(popupMenu.isOpen()).to.be.false;
      }));

    });

  });


  describe('with a mouse', function() {

    beforeEach(bootstrapModeler(diagramXML, {
      additionalModules: [ touchModule ]
    }));


    it('should leave the modeler as it is', inject(function(elementRegistry, selection, canvas) {

      // given
      var viewbox = canvas.viewbox();

      // when: touch events where (pointer: coarse) doesn't match
      tap(hit(elementRegistry, 'PI_Task_1'));

      // then: nothing handles them
      expect(selection.get()).to.eql([]);
      expect(canvas.viewbox()).to.eql(viewbox);
    }));


    it('should still select with the mouse', inject(function(elementRegistry, selection, eventBus) {

      // when
      eventBus.fire('element.click', {
        element: elementRegistry.get('PI_Task_1'),
        originalEvent: new MouseEvent('click')
      });

      // then
      expect(selection.get()).to.eql([ elementRegistry.get('PI_Task_1') ]);
    }));

  });


  it('should be part of no default modeler', function() {

    // the module is optional: apps add it
    var modules = Modeler.prototype._modules;

    expect(modules).not.to.include(touchModule);
  });

});
