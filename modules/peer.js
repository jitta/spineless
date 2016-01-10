var chalk = require('chalk');
var prettyjson = require('prettyjson');
var URL = require('url')

var call = require('../call')
var helper = require('../helper')

var GOSSIP_RATE = 3000
var HEARTBEAT_RATE = 500

function Peer(node){
  var that = this
  this.list = {}

  // hide from exposed
  helper.defineGetter(this, 'node', function(){ return node })

  node.server.post('/gossip', function(req, res, next){
    that.gossiped(req, res, next);
  });
  node.server.get('/peers', function(req, res, next){
    res.send(that.list)
  })

  this.initSeedList();

  node.on('start', function(){
    // add self to system
    var version = (new Date()).getTime();
    var peer = that.addByURL('http://' + node.hostname + ':' + node.port, version, node.namespace);

    peer._self = true
    that.me = peer;

    that.startGossip()
    // heartbeating
    setInterval(function(){
      peer.heartbeat += 1
    }, HEARTBEAT_RATE)
  })

  node.on('stop', function(){
    // TODO: stop gossip
    // TODO: stop heartbeating
  })


  return this
}

Peer.log = function(string) {
  console.log(chalk.cyan("[PEER] ") + string);
}

Peer.prototype.initSeedList = function() {
  var node = this.node;
  if (typeof node.options.seed === 'object'){
    for (var i in node.options.seed){
      var seed = this.addByURL(node.options.seed[i])
      seed._seed = true
    }
  }
}

Peer.prototype.gossiped = function(req, res, next) {
  // console.log('provide /gossip', this.node.namespace, this.list)
  if (!req.body && !req.body.list) {
    // 422: Unprocessable Entity
    return res.status(422).end();
  }

  Peer.log("incoming gossip from " + req.body.source.id);
  // console.log(prettyjson.render(req.body));
  var newPeers = this.reconcilePeerList(req.body.list);

  // TODO: Respond only diff to conserve network usage
  res.status(200).send({source: this.me, list: this.list});
}

Peer.prototype.reconcilePeerList = function(gossipedPeerList) {
  newPeers = [];

  for(var peerId in gossipedPeerList) {
    myPeer = this.list[peerId];
    var gossipedPeer = gossipedPeerList[peerId];

    if (myPeer === undefined || isNewerPeerInfo(gossipedPeer, myPeer)) {
      newPeers.push(gossipedPeer);
      // TODO: Create update method that doesn't store _self
      this.list[peerId] = gossipedPeer;
    }

  }

  if (newPeers.length > 0) {
    this.node.emit("newpeers");
    Peer.log("recieved " + newPeers.length + " new peers info | total: " + Object.keys(this.list).length);
    var newPeersId = newPeers.map(function(peer){ return peer.id; });
    // console.log(prettyjson.render(newPeersId));
  }

  return newPeers;
}

function isNewerPeerInfo(peerA, peerB) {

  if (peerA.version > peerB.version) return true;
  if (peerA.version === peerB.version && peerA.heartbeat > peerB.heartbeat)
    return true;
  return false;
}

Peer.prototype.addByURL = function(peerUrl, version, namespace) {
  var data = URL.parse(peerUrl);
  return this.add({
    id: data.hostname + ':' + data.port,
    hostname: data.hostname,
    port: data.port,
    url: peerUrl,
    data: {},
    namespace: namespace,
    heartbeat: 0,
    version: version || 0
  });
}

Peer.prototype.add = function(peer){
  if(!this.id(peer.id)){
    this.list[peer.id] = peer
    return peer
  } else {
    return false;
  }
}

Peer.prototype.id = function(id){
  // for(var i in this.list){
  //   if(this.list[i].id == id) return this.list[i]
  // }
  // return null
  return this.list[id]
}

Peer.prototype.getRandomPeer = function() {
  var ids = Object.keys(this.list)
  var peerID = ids[helper.getRandomInt(0, ids.length)];
  return this.list[peerID];
}

// Pick random peer that is not self
Peer.prototype.startGossip = function() {
  var that = this;

  if (Object.keys(this.list).length <= 1) {
    Peer.log("No one to gossip to...");
    setTimeout(function(){ that.startGossip(); }, GOSSIP_RATE + helper.getRandomInt(0, GOSSIP_RATE/10));
    return ;
  }

  var randomPeer = null;

  console.log(chalk.cyan("[GOSSIP] ") + "picking random peers");
  do  {
    randomPeer = this.getRandomPeer();
  } while(randomPeer === this.me);

  this.gossipTo(randomPeer, function(err, data){
    setTimeout(function(){ that.startGossip(); }, GOSSIP_RATE + helper.getRandomInt(0, GOSSIP_RATE/10));
  });

}

Peer.prototype.gossipTo = function(peer, callback) {
  var that = this;

  Peer.log("gossiping to " + peer.id);

  var data = {
    source: this.me,
    list: this.list
  }

  this.call(peer.id, 'gossip', data, function(err, data){
    if (!err && data.list) {
      // console.log(prettyjson.render(data.list));
      that.reconcilePeerList(data.list);
    } else {
      console.log(err);
    }
    callback(err, data);
  });
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
