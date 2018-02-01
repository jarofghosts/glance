var EE = require('events').EventEmitter
var parse = require('url').parse
var http = require('http')
var path = require('path')
var fs = require('fs')

var fileExists = require('utils-fs-exists')
var htmlls = require('html-ls')
var filed = require('filed')
var xtend = require('xtend')

var defaults = require('./lib/config')

var RESPONSE_HEADERS = {'content-type': 'text/html;charset=utf-8'}

module.exports = createGlance

function Glance (options) {
  EE.call(this)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.hideindex = options.hideindex
  this.indices = options.indices
  this.dir = path.normalize(options.dir)
  this.nodot = options.nodot

  return this
}

Glance.prototype = Object.create(EE.prototype)

Glance.prototype.start = function Glance$start () {
  var self = this

  self.server = http.createServer(function (req, res) {
    self.serveRequest(req, res)
  })

  self.server.listen(self.port, emitStarted)

  self.server.addListener('connection', function (con) {
    con.setTimeout(500)
  })

  self.on('error', showError)

  function emitStarted () {
    self.emit('started', self.server)
  }
}

Glance.prototype.stop = function Glance$stop () {
  if (this.server) {
    this.server.close()
  }
}

Glance.prototype.serveRequest = function Glance$serveRequest (req, res) {
  var request = {}
  var self = this

  request.fullPath = path.join(
    self.dir,
    decodeURIComponent(parse(req.url).pathname)
  )

  request.ip = req.socket.remoteAddress
  request.method = req.method.toLowerCase()
  request.response = res

  // prevent traversing directories that are parents of the root
  if (request.fullPath.slice(0, self.dir.length) !== self.dir) {
    return self.emit('error', 403, request, res)
  }

  if (request.method !== 'get') {
    return self.emit('error', 405, request, res)
  }

  if (self.nodot && /^\./.test(path.basename(request.fullPath))) {
    return self.emit('error', 404, request, res)
  }

  fs.stat(request.fullPath, statFile)

  function statFile (err, stat) {
    if (err) {
      return self.emit('error', 404, request, res)
    }

    if (!stat.isDirectory()) {
      self.emit('read', request)

      return filed(request.fullPath).pipe(res)
    }

    if (self.hideindex) {
      return self.emit('error', 403, request, res)
    }

    if (!self.indices || !self.indices.length) {
      return listFiles()
    }

    var indices = self.indices.slice()

    findIndex(indices.shift())

    function findIndex (indexTest) {
      fileExists(path.join(request.fullPath, indexTest), check)

      function check (hasIndex) {
        if (hasIndex) {
          req.url = req.url + '/' + indexTest

          return self.serveRequest(req, res)
        }

        if (!indices.length) {
          return listFiles()
        }

        findIndex(indices.shift())
      }
    }

    function listFiles () {
      var listPath = request.fullPath.replace(/\/$/, '')

      res.writeHead(200, RESPONSE_HEADERS)
      htmlls(listPath, {hideDot: self.nodot}).pipe(res)

      return self.emit('read', request)
    }
  }
}

function showError (errorCode, req, res) {
  res.writeHead(errorCode, RESPONSE_HEADERS)
  fs.createReadStream(
      path.join(__dirname, 'errors', errorCode + '.html')
  ).pipe(res)
}

function createGlance (options) {
  return new Glance(options)
}
