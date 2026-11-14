'use strict';

/**
 * diagram-js 6 replaced the commands connection.reconnectStart and
 * connection.reconnectEnd with connection.reconnect, which always gets both
 * newSource and newTarget. These helpers tell which end of the connection a
 * connection.reconnect command changes.
 *
 * Before the command executes, the connection still has its old ends; after
 * it executed, the handler keeps them as context.oldSource and
 * context.oldTarget. Both cases are handled.
 */

function getOldSource(context) {
  return 'oldSource' in context ? context.oldSource : context.connection.source;
}

function getOldTarget(context) {
  return 'oldTarget' in context ? context.oldTarget : context.connection.target;
}

/**
 * Whether the command connects the connection to another source, as the
 * former connection.reconnectStart command did. This includes reconnects
 * that swap source and target.
 *
 * @param {Object} context of a connection.reconnect command
 *
 * @return {boolean}
 */
function isReconnectStart(context) {
  return !!context.newSource && context.newSource !== getOldSource(context);
}

module.exports.isReconnectStart = isReconnectStart;


/**
 * Whether the command connects the connection to another target.
 *
 * @param {Object} context of a connection.reconnect command
 *
 * @return {boolean}
 */
function isReconnectEnd(context) {
  return !!context.newTarget && context.newTarget !== getOldTarget(context);
}

module.exports.isReconnectEnd = isReconnectEnd;
