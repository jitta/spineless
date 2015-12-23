var http = require('./http')
    call = require('./call'),
    morgan = require('morgan'),
    puid = new (require('puid'))(false),
    util = require('util'),
    EventEmitter = require("events")

var Node = function(namespace, seed){
  var that = this
  var _modules = []
  this.options = {
    seed: seed
  }
  this.namespace = namespace
  this.uid = puid.generate()
  this.generation = (new Date()).getTime() + parseFloat(Math.random().toFixed(4))

  _modules.push({id: 'peer', class: require('./modules/peer')})
  _modules.push({id: 'ping', class: require('./modules/ping')})

  // hide from exposed
  var server = http.createServer()
  defineGetter(this, 'server', function(){ return server })

  this.server.useFirst(morgan(this.namespace + ' | :method :url :status :response-time ms - :res[content-length]'))
  for(var i in _modules){
    var module = _modules[i]
    module.class(this, Node)
  }
  return this
}

// event emitter
// Node.prototype.__proto__ = EventEmitter.prototype

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
util.inherits(Node, EventEmitter)





var a = new Node('a')
a.start(3000)

setTimeout(function(){
  var b = new Node('b', ['http://127.0.0.1:3000'])
  b.start(3001)
}, 2000)

// call('http://localhost:3000/gossip', {call: true}, function(err, res){
//   console.log('call', typeof res, res)
// })

// setInterval(function(){
//   console.log(a)
// }, 5000)


function defineGetter(obj, name, getter) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: false,
    get: getter
  })
}
