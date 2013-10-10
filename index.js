#!/usr/bin/env node

var c = require('commander'),
    fs = require('fs'),
    xtend = require('xtend'),
    mime = require('mime'),
    parse = require('url').parse,
    http = require('http'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path'),
    colorConsole = require('colorize').console,
    htmlls = require('html-ls'),
    globalConfigFile = path.join(path.normalize(process.env.HOME || process.env.USERPROFILE), '.glance.json'),
    isCli = (require.main === module),
    defaults = {
      port: 61403,
      indexing: false,
      dir: process.cwd(),
      verbose: false,
      nodot: false
    };
function Glance(options) {
  
  if (!(this instanceof Glance)) return new Glance(options)

  options = xtend(defaults, options || {})

  this.port = options.port
  this.indexing = options.indexing
  this.dir = options.dir
  this.verbose = options.verbose
  this.nodot = options.nodot

  if (!this.dir.match(/^\//)) this.dir = path.normalize(this.dir)

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
    .listen(this.port);

  if (isCli || this.verbose) colorConsole.log(['#magenta[glance] ',
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
      var listPath = request.fullPath.replace(/\/$/, '')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      htmlls(listPath, { hideDot: this.nodot }).pipe(res);
      return this.emit('read', request);
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

  if (isCli) {

    try {
      var globalConfig = require(globalConfigFile);
      defaults = xtend(defaults, globalConfig);
    } catch (e) {}
    try {
      var localConfig = require(path.join(process.cwd(), '.glance.json'));
      defaults = xtend(defaults, localConfig);
    } catch (e) {}
    console.dir(defaults)

    c
      .version('0.2.1')
      .option('-d, --dir [dirname]', 'serve files from [dirname] | default cwd')
      .option('-i, --indexing', 'turn on autoindexing for directory requests | default off')
      .option('-n, --nodot', 'do not list or serve dotfiles | default off')
      .option('-p, --port [num]', 'serve on port [num] | default 61403', parseInt)
      .option('-v, --verbose', 'log connections to console | default off')
      .parse(process.argv);

    var cliOptions = {};
    if (c.dir !== undefined) cliOptions.dir = c.dir;
    if (c.indexing !== undefined) cliOptions.indexing = c.indexing;
    if (c.nodot !== undefined) cliOptions.nodot = c.nodot;
    if (c.port !== undefined) cliOptions.port = c.port;
    if (c.verbose !== undefined) cliOptions.verbose = c.verbose;

    new Glance(cliOptions).start();

}

