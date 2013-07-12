#!/usr/bin/env node
var c = require('commander'),
    fs = require('fs'),
    mime = require('mime'),
    parse = require('url').parse,
    http = require('http'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path'),
    colorConsole = require('colorize').console,
    htmlls = require('html-ls'),
    isCli = (require.main === module);

function Glance(options) {

  options = options || {};

  this.port = options.port || 61403;
  this.indexing = options.indexing;
  this.dir = options.dir || process.cwd();
  this.verbose = !!options.verbose;
  this.nodot = !!options.nodot;

  if (!this.dir.match(/^\//) || this.dir.match(/^\./)) {
    this.dir = path.normalize(this.dir);
  }

  return this;
}

util.inherits(Glance, EventEmitter);

Glance.prototype.start = function () {
  this.on('error', function (errorCode, request) {
    if (this.verbose) { colorConsole.log('#red[ERR' + errorCode + '] ' + request.ip + ' on #bold[' + request.fullPath + ']'); }
    showError(errorCode, request.response);
  });

  this.on('read', function (request) {
    if (this.verbose) { colorConsole.log('#green[INFO] ' + request.ip + ' read #bold[' + request.fullPath + ']'); }
  });

  this.server = http.createServer(function (req, res) { 
    var request = {
        fullPath: this.dir + decodeURIComponent(parse(req.url).pathname),
        ip: req.socket.remoteAddress,
        method: req.method.toLowerCase(),
        response: res
    };
    if (request.method != 'get') {
      this.emit('error', 405, request);
      return;
    }
    if (this.nodot && path.basename(request.fullPath).match(/^\./)) {
      this.emit('error', 404, request);
      return;
    }
    fs.stat(request.fullPath, function (err, stat) {
      if (err) {
        this.emit('error', 404, request);
        return;
      }
      if (stat.isDirectory()) {
        if (this.indexing) {
          var listPath = request.fullPath.replace(/\/$/, '');
          res.writeHead(200, { "Content-Type": "text/html" });
          htmlls(listPath, { hideDot: this.nodot }).pipe(res);
          this.emit('read', request);
        } else {
          this.emit('error', 403, request);
        }
        return;
      }
      this.emit('read', request);
      
      res.writeHead(200, { 'Content-Type': mime.lookup(request.fullPath) });
      fs.createReadStream(request.fullPath).pipe(res);
    
    }.bind(this));

  }.bind(this)).listen(this.port);
  if (isCli || this.verbose) { colorConsole.log('#magenta[glance] serving #bold[' + this.dir + '] on port #green[' + this.port + ']'); }
};

Glance.prototype.stop = function () {
  this.server && this.server.close();
};

function showError(errorCode, res) {
  res.writeHead(errorCode);
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res);
}

module.exports.createGlance = function (options) {
  return new Glance(options);
};

module.exports.Glance = Glance;

  if (isCli) {
  c
    .version('0.1.10')
    .option('-d, --dir [dirname]', 'serve files from [dirname] | default cwd')
    .option('-i, --indexing', 'turn on autoindexing for directory requests | default off')
    .option('-n, --nodot', 'do not list or serve dotfiles | default off')
    .option('-p, --port [num]', 'serve on port [num] | default 61403', parseInt)
    .option('-v, --verbose', 'log connections to console | default off')
    .parse(process.argv);

  new Glance({
    port: c.port,
    dir: c.dir,
    indexing: c.indexing,
    nodot: c.nodot,
    verbose: c.verbose
  }).start();

}

