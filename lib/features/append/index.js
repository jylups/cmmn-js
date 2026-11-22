module.exports = {
  __depends__: [
    require('../modeling')
  ],
  __init__: [ 'appendConnected' ],
  appendConnected: [ 'type', require('./AppendConnected') ]
};
