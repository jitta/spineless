var http = require('./http')
    call = require('./call'),
    morgan = require('morgan'),
    puid = new (require('puid'))(false),
    util = require('util'),
    EventEmitter = require("events"),
    chalk = require('chalk'),
    helper = require('./helper')

var Node = function(namespace, seed){
  var that = this
  var _modules = []

  // store initial seed list
  this.options = {
    seed: seed
  }
  this.namespace = namespace
  this.uid = puid.generate()
  this.generation = (new Date()).getTime() + parseFloat(Math.random().toFixed(4))

  _modules.push({id: 'peer', class: require('./modules/peer')})
  _modules.push({id: 'ping', class: require('./modules/ping')})
  _modules.push({id: 'route', class: require('./modules/route')})

  // hide from exposed
  var server = http.createServer()
  helper.defineGetter(this, 'server', function(){ return server })

  this.server.useFirst(morgan(chalk.blue("[SERVER] ") + this.namespace + ' | :method :url :status :response-time ms - :res[content-length]'))
  for(var i in _modules){
    var module = _modules[i]
    // start module, inject node dependencies
    module.class(this, Node)
  }
  return this
}

util.inherits(Node, EventEmitter)

Node.prototype.start = function(port, hostname, callback){
  var that = this
  if (typeof hostname == 'function'){
    callback = hostname
    this.hostname = null
  }
  this.hostname = hostname || '127.0.0.1'
  this.port = port
  this.id = this.hostname + ':' + this.port

  this.server.listen(port, this.hostname, function(){
    console.log('up ' + port)
    that.emit('start')
    callback && callback()
  })
}

module.exports = Node
