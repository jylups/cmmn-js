'use strict';

require('../../../TestHelper');

/* global sinon */

var touchModule = require('../../../../lib/features/touch'),
    createInputTracker = require('../../../../lib/features/touch/InputTracker').createInputTracker,
    nearestWaypoint = require('../../../../lib/features/touch/TouchInteraction').nearestWaypoint,
    TouchLabelEditing = require('../../../../lib/features/touch/TouchLabelEditing'),
    TouchContextPad = require('../../../../lib/features/touch/TouchContextPad');

var TouchTargetKeeper = TouchContextPad.TouchTargetKeeper,
    shouldCancelWaitingDrag = TouchContextPad.shouldCancelWaitingDrag;


describe('features - touch - helpers', function() {

  describe('module', function() {

    it('should start every touch service with the modeler', function() {
      expect(touchModule.__init__).to.eql([
        'touchInteraction',
        'touchFix',
        'touchLabelEditing',
        'touchContextPad'
      ]);

      expect(TouchLabelEditing.$inject).to.eql([ 'eventBus', 'directEditing' ]);
      expect(TouchContextPad.$inject).to.eql([ 'eventBus', 'dragging', 'canvas' ]);
    });

  });


  describe('createInputTracker', function() {

    var target, tracker;

    function press(pointerType) {
      var event = new Event('pointerdown');
      event.pointerType = pointerType;
      target.dispatchEvent(event);
    }

    beforeEach(function() {
      target = document.createElement('div');
      tracker = createInputTracker(target);
    });

    afterEach(function() {
      tracker.destroy();
    });


    it('should count as touch until a pointer is pressed', function() {
      expect(tracker.isMouse()).to.be.false;
    });


    it('should know a mouse or trackpad press', function() {

      // when
      press('mouse');

      // then
      expect(tracker.isMouse()).to.be.true;
    });


    it('should count a finger or a pen as touch', function() {

      press('mouse');
      press('touch');
      expect(tracker.isMouse()).to.be.false;

      press('mouse');
      press('pen');
      expect(tracker.isMouse()).to.be.false;
    });


    it('should stop listening when destroyed', function() {

      // when
      tracker.destroy();
      press('mouse');

      // then
      expect(tracker.isMouse()).to.be.false;
    });

  });


  describe('nearestWaypoint', function() {

    var waypoints = [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 } ];


    it('should find the waypoint a bendpoint handle sits on', function() {
      expect(nearestWaypoint(waypoints, { x: 100, y: 0 })).to.equal(1);
    });


    it('should find the closest one when the point is off every waypoint', function() {
      expect(nearestWaypoint(waypoints, { x: 92, y: 70 })).to.equal(2);
      expect(nearestWaypoint(waypoints, { x: 8, y: 5 })).to.equal(0);
    });

  });


  describe('TouchLabelEditing', function() {

    var listeners, directEditing, container, editor;

    function setUp(active) {
      listeners = {};

      var eventBus = {
        on: function(event, callback) {
          listeners[event] = callback;
        }
      };

      directEditing = {
        isActive: sinon.stub().returns(active),
        complete: sinon.spy()
      };

      container = document.createElement('div');
      editor = document.createElement('div');
      editor.className = TouchLabelEditing.EDITOR_SELECTOR.slice(1);
      editor.tabIndex = 0;
      container.appendChild(editor);
      document.body.appendChild(container);

      sinon.spy(editor, 'focus');

      // eslint-disable-next-line no-new
      new TouchLabelEditing(eventBus, directEditing);

      listeners['canvas.init']({ svg: { parentElement: container } });
    }

    function touchend() {
      var event = new Event('touchend', { cancelable: true });
      container.dispatchEvent(event);
      return event;
    }

    afterEach(function() {
      document.body.removeChild(container);
    });


    it('should finish an open label edit when the canvas is tapped', function() {

      // given
      setUp(true);

      // when
      listeners['element.click']();

      // then
      expect(directEditing.complete).to.have.been.calledOnce;
    });


    it('should do nothing on a tap when no label is being edited', function() {

      // given
      setUp(false);

      // when
      listeners['element.click']();

      // then
      expect(directEditing.complete).not.to.have.been.called;
    });


    it('should keep the focus in the editor that the double tap opened', function() {

      // given
      setUp(true);

      // when
      listeners['directEditing.activate']();
      var event = touchend();

      // then
      expect(event.defaultPrevented).to.be.true;
      expect(editor.focus).to.have.been.calledOnce;
    });


    it('should leave other touches alone', function() {

      // given
      setUp(true);

      // then
      expect(touchend().defaultPrevented).to.be.false;

      listeners['directEditing.activate']();
      touchend();

      expect(touchend().defaultPrevented).to.be.false;
      expect(editor.focus).to.have.been.calledOnce;
    });

  });


  describe('TouchTargetKeeper', function() {

    var clock, pad, entry, keeper;

    beforeEach(function() {
      clock = sinon.useFakeTimers();

      pad = document.createElement('div');
      entry = document.createElement('div');
      pad.appendChild(entry);
      document.body.appendChild(pad);

      keeper = new TouchTargetKeeper(document);
    });

    afterEach(function() {
      keeper.release();
      pad.remove();
      clock.restore();
    });


    it('should put the touched entry back in the page when the context pad removes it', function() {

      // given
      keeper.touchStarted(entry);
      pad.remove();
      expect(entry.isConnected).to.be.false;

      // when
      keeper.keep();

      // then
      expect(entry.isConnected).to.be.true;
      expect(entry.parentNode).not.to.equal(pad);
    });


    it('should leave an entry that is still in the page where it is', function() {

      // when
      keeper.touchStarted(entry);
      keeper.keep();

      // then
      expect(entry.parentNode).to.equal(pad);
    });


    it('should take the kept entry out of the page once the finger lifts', function() {

      // given
      keeper.touchStarted(entry);
      pad.remove();
      keeper.keep();

      // when
      entry.dispatchEvent(new Event('touchend'));

      // then
      expect(entry.isConnected).to.be.true;

      clock.tick(1);

      expect(entry.isConnected).to.be.false;
    });


    it('should keep it again from a touchmove, for removals that do not close the context pad', function() {

      // given
      keeper.touchStarted(entry);
      pad.remove();

      // when
      entry.dispatchEvent(new Event('touchmove'));

      // then
      expect(entry.isConnected).to.be.true;
    });

  });


  describe('shouldCancelWaitingDrag', function() {

    var touchDrag = { isTouch: true };


    it('should cancel a create started by a tap when the next touch is off the canvas', function() {
      expect(shouldCancelWaitingDrag(touchDrag, true, false)).to.be.true;
    });


    it('should let the next touch on the canvas place it', function() {
      expect(shouldCancelWaitingDrag(touchDrag, true, true)).to.be.false;
    });


    it('should leave drags started by a drag, mouse drags and no drag alone', function() {
      expect(shouldCancelWaitingDrag(touchDrag, false, false)).to.be.false;
      expect(shouldCancelWaitingDrag({ isTouch: false }, true, false)).to.be.false;
      expect(shouldCancelWaitingDrag(null, true, false)).to.be.false;
    });

  });

});
