var chalk = require('chalk');
var prettyjson = require('prettyjson');

var call = require('../call')
var helper = require('../helper')

function Route(node) {
  var that = this;
  this.routes = {};
  this.node = node;

  node.on("newpeers", function(){
    that.updateRoutes(node.peer.list);
  });
}

Route.log = function(string) {
  console.log(chalk.magenta("[ROUTE] ") + string);
}

Route.prototype.updateRoutes = function(peers) {
  var newRoutes = {};
  for (peerId in peers) {
    var peer = peers[peerId];
    var ns = peer.namespace;
    if (!ns) continue;
    if (!newRoutes[ns]) newRoutes[ns] = {};

    newRoutes[ns][peer.id] = true;
  }
  this.routes = newRoutes;

  Route.log("Routes updated");
  // Route.log("Routes updated\n" + prettyjson.render(this.routes));
}

Route.prototype.namespaces = function() {
  return Object.keys(this.routes);
}

Route.prototype.peersOf = function(namespace) {
  if (!this.routes[namespace]) return [];
  return Object.keys(this.routes[namespace]);
}


module.exports = function(node, prototype) {
  node.route = new Route(node);
  return node.route
}
