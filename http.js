var http = require('http')
var URL = require('url')
var Message = require('amp-message')
var Parser = require('amp').Stream
var bodyParser = require('body-parser')
var debug = require('debug')

function processReq(req, res, next){
  var path = URL.parse(req.url, true)
  req.path = path.pathname
  req.query = path.query
  if(req.headers['content-type'] == 'application/x-amp-message'){
    var parser = new Parser
    req.pipe(parser)
    parser.on('data', function(buf){
      req._body = true
      var msg = new Message(buf)
      req.body = msg.args[0]
      next()
    })
  } else {
    next()
  }
  return req
}

function processRes(req, res, next){
  res.status = function status(code){
    this.statusCode = code
    return this
  }

  res.send = function send(body){
    if(req.headers['content-type'] == 'application/x-amp-message'){
      var message = (new Message([body])).toBuffer()
    } else {
      var message = JSON.stringify(body)
    }
    res.setHeader('Content-Length', message.length)
    res.writeHead(this.statusCode || 200)
    res.end(message)
    return this
  }
  next()
}

function Router(){
  this.routing = {}
  return this
}

Router.prototype.routingHandle = function(scope){
  return function routingHandle(req, res, next){
    var id = req.method + ' ' + req.path
    if(scope.routing[id]){
      scope.routing[id](req, res)
    } else {
      res.status(400).send('Naahhh `' + id + '`')
    }
    // next()
  }
}
Router.prototype.routingRegister = function routingRegister(method, path, cb){
  var id = method + ' ' + path
  this.routing[id] = cb
}

function Hook(scope){
  var output = function hook(req, res){
    var index = 0
    var next = function next(){
      // console.log(output)
      var layer = output.stack[index++]
      if(layer){
        // console.log(stack.length, total, index, stack[index])
        layer(req, res, next)
      }
    }
    next()
  }
  output.stack = []
  return output
}

module.exports = {
  createServer: function(){
    var hook = new Hook()
    var router = new Router()
    var server = http.createServer(hook)
    server.use = function use(handle){
      hook.stack.push(handle)
    }
    server.useFirst = function use(handle){
      hook.stack.unshift(handle)
    }

    // for parsing application/json
    server.use(bodyParser.json())
    // for parsing application/x-www-form-urlencoded
    server.use(bodyParser.urlencoded({ extended: true }))
    server.use(processReq)
    server.use(processRes)
    server.use(router.routingHandle(router))
    server.get = function(path, handle){ router.routingRegister('GET', path, handle) }
    server.post = function(path, handle){ router.routingRegister('POST', path, handle) }
    server.delete = function(path, handle){ router.routingRegister('DELETE', path, handle) }
    server.put = function(path, handle){ router.routingRegister('PUT', path, handle) }
    server.head = function(path, handle){ router.routingRegister('HEAD', path, handle) }
    return server
  }
}
