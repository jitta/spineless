var Message = require('amp-message')

var message = new Message([{title:'ok'}])
// message.push()
var buff = message.toBuffer()
// console.log(buff)
console.log(Buffer.byteLength(buff))
console.log(buff.length)
// console.log(message)
