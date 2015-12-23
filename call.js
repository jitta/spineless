var Message = require('amp-message')
var Parser = require('amp').Stream
var http = require('http')
var URL = require('url')

module.exports = function(url, data, cb){
  url = URL.parse(url)
  var message = (new Message([data])).toBuffer()
  var options = {
    host: url.hostname,
    port: url.port,
    method: 'POST',
    path: url.path,
    headers: {
      'Content-Type': 'application/x-amp-message',
      'Content-Length': message.length
    }
  }

  var req = http.request(options, function(res){
    res.on('error', function(err){
      cb(err, res)
    })

    var parser = new Parser
    res.pipe(parser)
    parser.on('data', function(buf){
      var msg = new Message(buf)
      cb(null, msg.args[0])
    })
  })
  req.on('error', function(e){
    console.error(e)
    cb(e, null)
  })
  req.write(message)
  req.end()
}
