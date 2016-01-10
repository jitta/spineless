var argv = require('minimist')(process.argv.slice(2));
var Node = require('./node');

var service;

// TODO: Store initial seed list in config file
//       Maybe should be able to override via params
//
// check if it's a seed node
if(argv.s) {
  var service = new Node(argv.namespace);
} else {
  var service = new Node(argv.namespace, ["http://127.0.0.1:3000"]);
}

service.start(argv.port);
