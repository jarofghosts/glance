var EE = require('events').EventEmitter
  , parse = require('url').parse
  , http = require('http')
  , util = require('util')
  , path = require('path')
  , fs = require('fs')

var color = require('bash-color')
  , htmlls = require('html-ls')
  , filed = require('filed')
  , xtend = require('xtend')
  , combinedStream = require('combined-stream');

var defaults = {
    port: 61403
  , indexing: false
  , indices: []
  , dir: process.cwd()
  , verbose: false
  , nodot: false
}

module.exports.createGlance = createGlance 
module.exports.Glance = Glance
module.exports.defaults = defaults

function Glance(options) {
  if(!(this instanceof Glance)) return new Glance(options)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.indexing = options.indexing
  this.indices = options.indices
  this.dir = path.normalize(options.dir)
  this.verbose = options.verbose
  this.nodot = options.nodot

  return this
}

util.inherits(Glance, EE)

Glance.prototype.start = function Glance$start() {
  var self = this

  self.on('error', on_error)
  self.on('read', on_read)

  self.server = http.createServer(function(req, res) {
    self.serveRequest(req, res)
  })

  self.server.listen(self.port, output_listening)

  self.server.addListener('connection', function(con) {
    con.setTimeout(500)
  })

  function output_listening() {
    if(!self.verbose) return

    console.log(
        color.purple('glance') + ' serving ' + color.yellow(self.dir, true) +
        ' on port ' + color.green(self.port)
    )
  }

  function on_read(request) {
    if(!self.verbose) return

    console.log(
       color.green(request.ip) + ' read ' +
       color.yellow(request.fullPath, true)
    )
  }

  function on_error(errorCode, request) {
    show_error(errorCode, request.response)

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

Glance.prototype.serveRequest = function glanceRequest(req, res) {
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

  fs.stat(request.fullPath, stat_file)

  function stat_file(err, stat) {
    if(err) return self.emit('error', 404, request)
    if(!stat.isDirectory()) {
      self.emit('read', request)

      filed(request.fullPath).pipe(process.stdout)
      return filed(request.fullPath).pipe(res)
    }

    if(!self.indexing) return self.emit('error', 403, request)
    if(!self.indices || !self.indices.length) return list_files()

    var indices = self.indices.slice()

    find_index(indices.shift())

    function find_index(index_test) {
      fs.exists(path.join(request.fullPath, index_test), check)

      function check(has_index) {
        if(has_index) {
          req.url = path.join(req.url, index_test)

          return self.serveRequest(req, res)
        }

        if(!indices.length) return list_files()
        find_index(indices.shift())
      }
    }

    function list_files() {
      var list_path = request.fullPath.replace(/\/$/, '')
      var output = combinedStream.create()
      res.writeHead(200, {'content-type': 'text/html;charset=utf-8'})
      output.appened(
        fs.createReadStream(
           path.join(__dirname, 'common', 'header.html')
        )
      ) 
      output.append(htmlls(list_path, {hideDot: self.nodot}))
      output.pipe(res)

      return self.emit('read', request)
    }
  }
}

function show_error(error_code, res) {
  var output = combinedStream.create()
  res.writeHead(error_code, {'content-type': 'text/html;charset=utf-8'})
  output.appened(
    fs.createReadStream(
        path.join(__dirname, 'common', 'header.html')
    )
  )
  output.appened( 
    fs.createReadStream(
        path.join(__dirname, 'errors', error_code + '.html')
    )
  )
  output.pipe(res)
}

function createGlance(options) {
  return new Glance(options)
}
