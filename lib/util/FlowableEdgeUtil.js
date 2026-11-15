'use strict';

var find = require('min-dash').find,
    forEach = require('min-dash').forEach;

var is = require('./ModelUtil').is;

/**
 * Edges of sentry connectors in two forms.
 *
 * CMMN 1.1 references the on-part from the cmmnElementRef of the
 * cmmndi:CMMNEdge, and the criterion from its targetCMMNElementRef. The
 * source is the sourceRef of the on-part.
 *
 * Flowable writes the two ends instead: the plan item and the criterion, in
 * the cmmnElementRef and the targetCMMNElementRef, in either order. Flowable
 * writes the plan item first; its modeler also writes the criterion first,
 * with the waypoints from the criterion to the plan item.
 *
 * cmmn-js works with the CMMN form. An edge read in Flowable's form is
 * resolved to its on-part on import, and written in Flowable's form again on
 * save. An edge read in the CMMN form keeps that form; a connector created in
 * cmmn-js is written in Flowable's form.
 */

/**
 * The form an edge was read in.
 */
var FORM = '$edgeForm';

var CMMN = 'cmmn',
    FLOWABLE = 'flowable',
    FLOWABLE_REVERSED = 'flowable-reversed';

module.exports.CMMN = CMMN;
module.exports.FLOWABLE = FLOWABLE;
module.exports.FLOWABLE_REVERSED = FLOWABLE_REVERSED;


/**
 * Return the form the given edge was read in, if any.
 *
 * @param {ModdleElement} edge cmmndi:CMMNEdge
 *
 * @return {string|undefined}
 */
function getEdgeForm(edge) {
  return edge[FORM];
}

module.exports.getEdgeForm = getEdgeForm;


/**
 * Prepare an edge for import: resolve an edge in Flowable's form to the
 * CMMN form, and remember the form it was read in.
 *
 * @param {ModdleElement} edge cmmndi:CMMNEdge
 * @param {Array<ModdleElement>} claimedOnParts on-parts of edges resolved
 *                                              so far; updated
 */
function resolveEdge(edge, claimedOnParts) {

  var cmmnElement = edge.cmmnElementRef,
      target = edge.targetCMMNElementRef;

  if (is(cmmnElement, 'cmmn:OnPart')) {
    edge[FORM] = CMMN;
    claimedOnParts.push(cmmnElement);
    return;
  }

  var reversed = is(cmmnElement, 'cmmn:Criterion') && is(target, 'cmmn:PlanItem'),
      planItem = reversed ? target : cmmnElement,
      criterion = reversed ? cmmnElement : target;

  if (!is(planItem, 'cmmn:PlanItem') || !is(criterion, 'cmmn:Criterion')) {
    return;
  }

  var onPart = findOnPart(criterion, planItem, claimedOnParts);

  if (!onPart) {
    return;
  }

  claimedOnParts.push(onPart);

  edge.cmmnElementRef = onPart;
  edge.targetCMMNElementRef = criterion;

  if (reversed) {
    reverseWaypoints(edge);
  }

  edge[FORM] = reversed ? FLOWABLE_REVERSED : FLOWABLE;
}

module.exports.resolveEdge = resolveEdge;


/**
 * Find the on-part of the criterion's sentry with the given plan item as its
 * source, which no other edge references.
 *
 * @param {ModdleElement} criterion
 * @param {ModdleElement} planItem
 * @param {Array<ModdleElement>} claimedOnParts
 *
 * @return {ModdleElement|undefined} cmmn:PlanItemOnPart
 */
function findOnPart(criterion, planItem, claimedOnParts) {
  var sentry = criterion.sentryRef;

  return find((sentry && sentry.onParts) || [], function(onPart) {
    return is(onPart, 'cmmn:PlanItemOnPart') &&
           onPart.sourceRef === planItem &&
           !onPart.exitCriterionRef &&
           claimedOnParts.indexOf(onPart) === -1;
  });
}


/**
 * Whether the given edge can be written in Flowable's form: it connects a
 * plan item, through a plan item on-part, to a criterion.
 *
 * @param {ModdleElement} edge cmmndi:CMMNEdge
 *
 * @return {boolean}
 */
function canWriteFlowableForm(edge) {
  var onPart = edge.cmmnElementRef;

  return is(onPart, 'cmmn:PlanItemOnPart') &&
         is(onPart.sourceRef, 'cmmn:PlanItem') &&
         !onPart.exitCriterionRef &&
         is(edge.targetCMMNElementRef, 'cmmn:Criterion');
}


/**
 * Switch the edges of the given definitions that are not to be written in
 * the CMMN form to Flowable's form.
 *
 * @param {ModdleElement} definitions cmmn:Definitions
 *
 * @return {Function} restores the edges to the CMMN form
 */
function toFlowableForm(definitions) {

  var changed = [];

  forEach(getEdges(definitions), function(edge) {

    var form = getEdgeForm(edge);

    if (form === CMMN || !canWriteFlowableForm(edge)) {
      return;
    }

    var reversed = form === FLOWABLE_REVERSED,
        onPart = edge.cmmnElementRef,
        criterion = edge.targetCMMNElementRef,
        planItem = onPart.sourceRef;

    changed.push({
      edge: edge,
      cmmnElementRef: onPart,
      targetCMMNElementRef: criterion,
      waypoint: edge.waypoint
    });

    edge.cmmnElementRef = reversed ? criterion : planItem;
    edge.targetCMMNElementRef = reversed ? planItem : criterion;

    if (reversed) {
      reverseWaypoints(edge);
    }
  });

  return function restore() {
    forEach(changed, function(entry) {
      var edge = entry.edge;

      edge.cmmnElementRef = entry.cmmnElementRef;
      edge.targetCMMNElementRef = entry.targetCMMNElementRef;
      edge.waypoint = entry.waypoint;
    });
  };
}

module.exports.toFlowableForm = toFlowableForm;


function getEdges(definitions) {
  var edges = [];

  var cmmndi = definitions && definitions.CMMNDI;

  forEach((cmmndi && cmmndi.diagrams) || [], function(diagram) {
    forEach(diagram.diagramElements || [], function(element) {
      if (is(element, 'cmmndi:CMMNEdge')) {
        edges.push(element);
      }
    });
  });

  return edges;
}

/**
 * Replace the waypoints of the edge with a reversed copy.
 */
function reverseWaypoints(edge) {
  if (edge.waypoint) {
    edge.waypoint = edge.waypoint.slice().reverse();
  }
}
