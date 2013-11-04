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
function Glance(options) {
  if (!(this instanceof Glance)) return new Glance(options)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.indexing = options.indexing
  this.indices = options.indices
  this.dir = options.dir
  this.verbose = options.verbose
  this.nodot = options.nodot

  this.dir = path.normalize(this.dir)

  return this
}

util.inherits(Glance, EventEmitter);

Glance.prototype.start = function () {
  this.on('error', function (errorCode, request) {
    if (this.verbose) colorConsole.log(['#red[ERR', errorCode, '] ',
      request.ip, ' on #bold[', request.fullPath, ']'].join(''))
    showError(errorCode, request.response);
  })

  this.on('read', function (request) {
    if (this.verbose) colorConsole.log(['#green[INFO] ', request.ip,
      ' read #bold[', request.fullPath, ']'].join(''))
  })

  this.server = http.createServer(this.serveRequest.bind(this))
    .listen(this.port)

  if (this.verbose) colorConsole.log(['#magenta[glance] ',
    'serving #bold[', this.dir, '] on port #green[', this.port, ']'].join(''))

}

Glance.prototype.stop = function () {
  this.server && this.server.close()
}

Glance.prototype.serveRequest = function (req, res) {
  var request = {
      fullPath: path.join(this.dir,
        decodeURIComponent(parse(req.url).pathname)),
      ip: req.socket.remoteAddress,
      method: req.method.toLowerCase(),
      response: res
  }
  if (request.method != 'get') return this.emit('error', 405, request)
  if (this.nodot && /^\./.test(path.basename(request.fullPath))) {
    return this.emit('error', 404, request)
  }
  fs.stat(request.fullPath, function (err, stat) {
    if (err) return this.emit('error', 404, request)
    if (stat.isDirectory()) {
      if (!this.indexing) return this.emit('error', 403, request)
      if (this.indices && this.indices.length) {
        for (var i = 0, l = this.indices.length; i < l; ++i) {
          if (fs.existsSync(path.join(request.fullPath, this.indices[i]))) {
            req.url = path.join(req.url, this.indices[i])
            return this.serveRequest(req, res)
          }
        }
      }
      var listPath = request.fullPath.replace(/\/$/, '')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      htmlls(listPath, { hideDot: this.nodot }).pipe(res)

      return this.emit('read', request)
    }
    this.emit('read', request)
    
    res.writeHead(200, { 'Content-Type': mime.lookup(request.fullPath) })
    fs.createReadStream(request.fullPath).pipe(res)
  
  }.bind(this))

}

function showError(errorCode, res) {
  res.writeHead(errorCode)
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res)
}

module.exports.createGlance = function (options) {
  return new Glance(options)
}

module.exports.Glance = Glance
