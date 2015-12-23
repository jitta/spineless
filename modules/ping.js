module.exports = function(node, prototype){
  node.server.get('/ping', function(req, res, next){
    res.status(200).end()
    // next()
  })
}
