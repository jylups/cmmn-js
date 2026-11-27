'use strict';

/**
 * A simple line icon, as a data URL for a context pad entry's imageUrl.
 *
 * @param {String} paths the SVG drawing, on a 24 x 24 grid
 *
 * @return {String}
 */
module.exports = function lineIcon(paths) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1e293b" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};
