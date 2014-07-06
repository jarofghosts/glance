var EE = require('events').EventEmitter
  , parse = require('url').parse
  , http = require('http')
  , path = require('path')
  , fs = require('fs')

var color = require('bash-color')
  , htmlls = require('html-ls')
  , filed = require('filed')
  , xtend = require('xtend')

var defaults = require('./lib/config')

module.exports = createGlance 

function Glance(options) {
  EE.call(this)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.hideindex = options.hideindex
  this.indices = options.indices
  this.dir = path.normalize(options.dir)
  this.verbose = options.verbose
  this.nodot = options.nodot

  return this
}

Glance.prototype = Object.create(EE.prototype)

Glance.prototype.start = function Glance$start() {
  var self = this

  self.on('error', onError)
  self.on('read', onRead)

  self.server = http.createServer(function(req, res) {
    self.serveRequest(req, res)
  })

  self.server.listen(self.port, outputListening)

  self.server.addListener('connection', function(con) {
    con.setTimeout(500)
  })

  function outputListening() {
    if(!self.verbose) return

    console.log(
        color.purple('glance') + ' serving ' + color.yellow(self.dir, true) +
        ' on port ' + color.green(self.port)
    )
  }

  function onRead(request) {
    if(!self.verbose) return

    console.log(
       color.green(request.ip) + ' read ' +
       color.yellow(request.fullPath, true)
    )
  }

  function onError(errorCode, request) {
    showError(errorCode, request.response)

    if(!self.verbose) return

    console.log(
        color.red('ERR' + errorCode) + ' ' + request.ip + ' on ' + 
        color.yellow(request.fullPath, true)
    )
  }
}

Glance.prototype.stop = function Glance$stop() {
  if(this.server) this.server.close()
}

Glance.prototype.serveRequest = function Glance$serveRequest(req, res) {
  var request = {}
    , self = this

  request.fullPath = path.join(
      self.dir
    , decodeURIComponent(parse(req.url).pathname)
  )

  request.ip = req.socket.remoteAddress
  request.method = req.method.toLowerCase()
  request.response = res

  if(request.method !== 'get') return self.emit('error', 405, request)

  if(self.nodot && /^\./.test(path.basename(request.fullPath))) {
    return self.emit('error', 404, request)
  }

  fs.stat(request.fullPath, statFile)

  function statFile(err, stat) {
    if(err) return self.emit('error', 404, request)
    if(!stat.isDirectory()) {
      self.emit('read', request)

      return filed(request.fullPath).pipe(res)
    }

    if(self.hideindex) return self.emit('error', 403, request)
    if(!self.indices || !self.indices.length) return listFiles()

    var indices = self.indices.slice()

    findIndex(indices.shift())

    function findIndex(indexTest) {
      fs.exists(path.join(request.fullPath, indexTest), check)

      function check(hasIndex) {
        if(hasIndex) {
          req.url = req.url + '/' + indexTest

          return self.serveRequest(req, res)
        }

        if(!indices.length) return listFiles()
        findIndex(indices.shift())
      }
    }

    function listFiles() {
      var listPath = request.fullPath.replace(/\/$/, '')

      res.writeHead(200, {'content-type': 'text/html;charset=utf-8'})
      htmlls(listPath, {hideDot: self.nodot}).pipe(res)

      return self.emit('read', request)
    }
  }
}

function showError(errorCode, res) {
  res.writeHead(errorCode, {'content-type': 'text/html;charset=utf-8'})
  fs.createReadStream(
      path.join(__dirname, 'errors', errorCode + '.html')
  ).pipe(res)
}

function createGlance(options) {
  return new Glance(options)
}
