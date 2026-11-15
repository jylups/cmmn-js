'use strict';

var forEach = require('min-dash').forEach,
    isArray = require('min-dash').isArray;

var is = require('./ModelUtil').is;

/**
 * Criteria whose sentry is written as flowable:sentryRef.
 *
 * Some Flowable models write the sentry of a criterion as
 * flowable:sentryRef instead of sentryRef. Flowable reads both; moddle keeps
 * flowable:sentryRef as an unknown attribute, so the criterion has no
 * sentry.
 *
 * On import, the sentry referenced by flowable:sentryRef becomes the
 * criterion's sentryRef, and the criterion remembers the attribute it was
 * read with. On save, it is written as flowable:sentryRef again, with the
 * criterion's current sentry.
 */

var ATTRIBUTE = 'flowable:sentryRef';

/**
 * Marks a criterion read with flowable:sentryRef.
 */
var FLAG = '$flowableSentryRef';


/**
 * Resolve flowable:sentryRef of the criteria of the given definitions.
 *
 * @param {ModdleElement} definitions cmmn:Definitions
 */
function resolveSentryRefs(definitions) {

  var found = collect(definitions);

  forEach(found.criteria, function(criterion) {

    var attrs = criterion.$attrs,
        sentryId = attrs && attrs[ATTRIBUTE];

    if (!sentryId || criterion.sentryRef) {
      return;
    }

    var sentry = found.sentries[sentryId];

    if (!sentry) {
      return;
    }

    criterion.sentryRef = sentry;
    delete attrs[ATTRIBUTE];

    criterion[FLAG] = true;
  });
}

module.exports.resolveSentryRefs = resolveSentryRefs;


/**
 * Write the sentry of the criteria read with flowable:sentryRef as
 * flowable:sentryRef again.
 *
 * @param {ModdleElement} definitions cmmn:Definitions
 *
 * @return {Function} restores the criteria
 */
function toFlowableSentryRefs(definitions) {

  var changed = [];

  forEach(collect(definitions).criteria, function(criterion) {

    var sentry = criterion.sentryRef;

    if (!criterion[FLAG] || !sentry) {
      return;
    }

    changed.push({ criterion: criterion, sentry: sentry });

    criterion.sentryRef = undefined;
    criterion.$attrs[ATTRIBUTE] = sentry.id;
  });

  return function restore() {
    forEach(changed, function(entry) {
      var criterion = entry.criterion;

      delete criterion.$attrs[ATTRIBUTE];
      criterion.sentryRef = entry.sentry;
    });
  };
}

module.exports.toFlowableSentryRefs = toFlowableSentryRefs;


/**
 * Collect the criteria and the sentries (by ID) contained in the given
 * element.
 */
function collect(element) {

  var result = {
    criteria: [],
    sentries: {}
  };

  var visited = [];

  function visit(el) {

    if (!el || !el.$descriptor || visited.indexOf(el) !== -1) {
      return;
    }

    visited.push(el);

    if (is(el, 'cmmn:Criterion')) {
      result.criteria.push(el);
    }

    if (is(el, 'cmmn:Sentry') && el.id) {
      result.sentries[el.id] = el;
    }

    forEach(el.$descriptor.properties, function(property) {

      if (property.isReference || property.isAttr) {
        return;
      }

      var value = el[property.name];

      if (isArray(value)) {
        forEach(value, visit);
      } else {
        visit(value);
      }
    });
  }

  visit(element);

  return result;
}
