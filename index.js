var EE = require('events').EventEmitter
var parse = require('url').parse
var http = require('http')
var path = require('path')
var fs = require('fs')

var fileExists = require('utils-fs-exists')
var htmlls = require('html-ls')
var filed = require('filed')
var xtend = require('xtend')
var replace = require('stream-replace')

var defaults = require('./lib/config')

var RESPONSE_HEADERS = {'content-type': 'text/html;charset=utf-8'}

module.exports = createGlance

function Glance(options) {
  EE.call(this)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.hideindex = options.hideindex
  this.indices = options.indices
  this.dir = path.resolve(options.dir)
  this.nodot = options.nodot

  return this
}

Glance.prototype = Object.create(EE.prototype)

Glance.prototype.start = function Glance$start() {
  var self = this

  self.server = http.createServer(function (req, res) {
    self.serveRequest(req, res)
  })

  self.server.listen(self.port, emitStarted)

  self.server.addListener('connection', function (con) {
    con.setTimeout(500)
  })

  self.on('error', showError)

  function emitStarted() {
    self.emit('started', self.server)
  }
}

Glance.prototype.stop = function Glance$stop() {
  if (this.server) {
    this.server.close()
  }
}

Glance.prototype.serveRequest = function Glance$serveRequest(req, res) {
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
  if (path.relative(self.dir, request.fullPath).startsWith('..')) {
    return self.emit('error', 403, request, res)
  }

  if (request.method !== 'get') {
    return self.emit('error', 405, request, res)
  }

  if (
    self.nodot &&
    request.fullPath.split(path.sep).some(function (dir) {
      return dir.startsWith('.')
    })
  ) {
    return self.emit('error', 404, request, res)
  }

  fs.stat(request.fullPath, statFile)

  function statFile(err, stat) {
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

    function findIndex(indexTest) {
      fileExists(path.join(request.fullPath, indexTest), check)

      function check(hasIndex) {
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

    function listFiles() {
      var listPath = request.fullPath.replace(/\/$/, '')

      res.writeHead(200, RESPONSE_HEADERS)

      var listingHtml = '<h3>Directory Listing</h3>'

      var listing = htmlls(listPath, {
        hideDot: self.nodot,
        transformHref: function (str) {
          return encodeURI(str)
        },
        transformLinkText: function (str) {
          return str.replace(/\</g, '&lt;').replace(/\>/g, '&gt;')
        },
      })

      listing.on('data', function (buf) {
        listingHtml += buf.toString()
      })

      listing.on('end', function () {
        renderPage('Directory Listing', listingHtml, res)
      })

      return self.emit('read', request)
    }
  }
}

function showError(errorCode, req, res) {
  res.writeHead(errorCode, RESPONSE_HEADERS)

  var errorHtml = ''

  var errorPage = fs.createReadStream(
    path.join(__dirname, 'errors', errorCode + '.html')
  )

  errorPage.on('data', function (buf) {
    errorHtml += buf.toString()
  })

  errorPage.on('end', function () {
    var title = errorTitle(errorCode)
    renderPage(title, errorHtml, res)
  })
}

function renderPage(title, body, res) {
  var layout = fs.createReadStream(
    path.join(__dirname, 'errors/shared/layout.html')
  )
  layout
    .pipe(replace(/{{\s*title\s*}}/g, title))
    .pipe(replace(/{{\s*body\s*}}/g, body))
    .pipe(res)
}

function errorTitle(errorCode) {
  var mappings = {
    404: 'File Not Found',
    403: 'Forbidden',
    405: 'Method Not Allowed',
    500: 'Internal Server Error',
  }
  return mappings[errorCode.toString()]
}

function createGlance(options) {
  return new Glance(options)
}
