var URL = require('url')
var call = require('../call')

var GOSSIP_RATE = 3000
var HEARTBEAT_RATE = 1000

function processData(my, other){
  for(var i in other){
    if (other[i].self)
    if(my[i]){
      // TODO: check version before write
      my[i] = other[i]
    } else {
      my[i] = other[i]
    }
  }
}

function Peer(node){
  var that = this
  this.list = {}

  // hide from exposed
  defineGetter(this, 'node', function(){ return node })

  node.server.post('/gossip', function(req, res, next){
    console.log('provide /gossip', that.node.namespace, that.list)
    if(req.body && req.body.list){
      for(var i in req.body.list){
        that.add(req.body.list[i])
      }
    }
    processData(that.list, req.body.list)
    // if(req.body){
    //   if(req.body.me){
    //     that.add('http://' + req.body.me.id)
    //   }
    // } else {
    //   res.status(500).send('Bad! no data to gossip')
    // }
    // console.log(that.node.namespace, that.list)
    res.status(200).send({
      list: that.list,
      delta: that.listVersion()
    })
    // next()
  })

  node.server.get('/peers', function(req, res, next){
    res.send(that.list)
  })

  if(typeof node.options.seed === 'object'){
    for(var i in node.options.seed){
      var seed = that.add(node.options.seed[i])
      seed._seed = true
    }
  }


  node.on('start', function(){
    // add self to system
    var peer = that.add('http://' + node.hostname + ':' + node.port)
    peer._self = true

    that.gossip()
    // heartbeating
    setInterval(function(){
      peer.heartbeat += 1
    }, HEARTBEAT_RATE)
  })

  node.on('stop', function(){
    // stop gossip
    // stop heartbeating
  })


  return this
}

Peer.prototype.add = function(url){
  if(typeof url == 'string'){
    var data = URL.parse(url)
    var peer = {
      id: data.hostname + ':' + data.port,
      hostname: data.hostname,
      port: data.port,
      url: url,
      data: {},
      heartbeat: 0,
      version: 0
    }
  } else var peer = url
  if(!this.id(peer.id)){
    this.list[peer.id] = peer
    return peer
  } else return false
}

Peer.prototype.id = function(id){
  // for(var i in this.list){
  //   if(this.list[i].id == id) return this.list[i]
  // }
  // return null
  return this.list[id]
}

Peer.prototype.gossip = function(id){
  var that = this

  // random someone to gissip with
  if(typeof id == 'undefined'){
    var ids = Object.keys(this.list)
    var peer = this.list[ids[Math.floor(Math.random()*ids.length)]]
    if(peer._self){
      setTimeout(function(){
        that.gossip.apply(that)
      }, GOSSIP_RATE)
      return
    }
    id = peer.id
    console.log(that.node.namespace, 'try gossip with', id)
  }

  var data = {
    list: that.list,
    delta: that.listVersion()
  }

  that.call(id, 'gossip', data, function(err, data){
    setTimeout(function(){
      that.gossip.apply(that)
    }, GOSSIP_RATE)
  })


}

Peer.prototype.listVersion = function(){
  var data = {}
  for(var i in this.list){
    var item = this.list[i]
    if(item.version) data[item.id]
  }
  return data
}

Peer.prototype.call = function(id, path, data, callback){
  var that = this
  if(arguments.length == 3){
    callback = data
    data = null
  }
  call('http://' + id + '/' + path, data, function(err, res, body){
    // var node = that.id(id)
    callback.apply(null, [].slice.call(arguments))
  })
}

module.exports = function(node, prototype){
  node.peer = new Peer(node)
  return node.peer
}

function defineGetter(obj, name, getter) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: false,
    get: getter
  })
}
