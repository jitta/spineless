var chalk = require('chalk');
var prettyjson = require('prettyjson');

var call = require('../call')
var helper = require('../helper')

function Service(node) {
  var that = this;
  this.services = {};
}

Service.prototype.provide = function(name, service) {
  if(typeof service !== 'function') {
    // TODO: throw exception
  }

  this.services[name] = service;

};

Service.prototype.



Service.log = function(string) {
  console.log(chalk.magenta("[SERVICE] ") + string);
}

module.exports = function(node, prototype) {
  node.service = new Service(node);
  return node.service
}
