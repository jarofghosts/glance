var fs = require('fs'),
    xtend = require('xtend'),
    mime = require('mime'),
    parse = require('url').parse,
    http = require('http'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path'),
    colorConsole = require('colorize').console,
    htmlls = require('html-ls'),
    defaults = {
      port: 61403,
      indexing: false,
      indices: [],
      dir: process.cwd(),
      verbose: false,
      nodot: false
    }

module.exports.Glance = Glance
module.exports.defaults = defaults

function Glance(options) {
  if (!(this instanceof Glance)) return new Glance(options)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.indexing = options.indexing
  this.indices = options.indices
  this.dir = path.normalize(options.dir)
  this.verbose = options.verbose
  this.nodot = options.nodot

  return this
}

util.inherits(Glance, EventEmitter)

Glance.prototype.start = function startGlance() {
  this.on('error', on_error)
  this.on('read', on_read)

  this.server = http.createServer(this.serveRequest.bind(this))
    .listen(this.port)

  if (this.verbose) colorConsole.log(['#magenta[glance] ',
    'serving #bold[', this.dir, '] on port #green[', this.port, ']'].join(''))

  function on_read(request) {
    if (this.verbose) colorConsole.log(['#green[INFO] ', request.ip,
      ' read #bold[', request.fullPath, ']'].join(''))
  }

  function on_error(errorCode, request) {
    if (this.verbose) colorConsole.log(['#red[ERR', errorCode, '] ',
      request.ip, ' on #bold[', request.fullPath, ']'].join(''))
    showError(errorCode, request.response)
  }

}

Glance.prototype.stop = function stopGlance() {
  this.server && this.server.close()
}

Glance.prototype.serveRequest = function glanceRequest(req, res) {
  var self = this,
      request = {}

  request.fullPath = path.join(
    self.dir,
    decodeURIComponent(parse(req.url).pathname)
  )
  request.ip = req.socket.remoteAddress
  request.method = req.method.toLowerCase()
  request.response = res

  if (request.method !== 'get') return self.emit('error', 405, request)
  if (self.nodot && /^\./.test(path.basename(request.fullPath))) {
    return self.emit('error', 404, request)
  }
  fs.stat(request.fullPath, stat_file)

  function stat_file(err, stat) {
    if (err) return self.emit('error', 404, request)
    if (!stat.isDirectory()) {
      self.emit('read', request)
      
      res.writeHead(200, { 'Content-Type': mime.lookup(request.fullPath) })
      return fs.createReadStream(request.fullPath).pipe(res)
    }

    if (!self.indexing) return self.emit('error', 403, request)
    if (!self.indices || !self.indices.length) return list_files()

    var indices = self.indices.slice()

    !function find_index(index_test) {
      fs.exists(path.join(request.fullPath, index_test), check)
      function check(has_index) {
        if (has_index) {
          req.url = path.join(req.url, index_test)
          return self.serveRequest(req, res)
        }

        if (!indices.length) return list_files()
        find_index(indices.shift())
      }
    }(indices.shift())

    function list_files() {
      var listPath = request.fullPath.replace(/\/$/, '')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      htmlls(listPath, { hideDot: self.nodot }).pipe(res)

      return self.emit('read', request)
    }
  }
}

function showError(errorCode, res) {
  res.writeHead(errorCode)
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res)
}

module.exports.createGlance = function createGlance(options) {
  return new Glance(options)
}
