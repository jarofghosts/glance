#!/usr/bin/env node
var c = require('commander'),
    fs = require('fs'),
    mime = require('mime'),
    parse = require('url').parse,
    http = require('http'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path');

function Glance(options) {

  options = options || {};

  this.port = options.port || 61403;
  this.dir = options.dir || process.cwd();
  this.verbose = options.verbose;

  if (!this.dir.match(/^\//) || this.dir.match(/^\./)) {
    this.dir = path.normalize(this.dir);
  }

  return this;
}

util.inherits(Glance, EventEmitter);

Glance.prototype.start = function () {
  this.on('error', function (errorCode, request) {
    if (this.verbose) { console.log(request.ip + ' error ' + errorCode + ' on ' + request.fullPath); }
    showError(errorCode, request.response);
  });

  this.on('read', function (request) {
    if (this.verbose) { console.log(request.ip + ' read ' + request.fullPath); }
  });

  this.server = http.createServer(function (req, res) { 
    var request = {
        fullPath: this.dir + parse(req.url).pathname,
        ip: req.socket.remoteAddress,
        method: req.method.toLowerCase(),
        response: res
    };
    if (request.method != 'get') {
      this.emit('error', 405, request);
      return;
    }
    fs.stat(request.fullPath, function (err, stat) {
      if (err) {
        this.emit('error', 404, request);
        return;
      }
      if (stat.isDirectory()) {
        this.emit('error', 'no-index', request);
        return;
      }
      this.emit('read', request);
      
      res.writeHead(200, { 'Content-Type': mime.lookup(request.fullPath) });
      fs.createReadStream(request.fullPath).pipe(res);
    
    }.bind(this));

  }.bind(this));
  this.server.listen(this.port);

};

Glance.prototype.stop = function () {
  this.server && this.server.close();
};

function showError(errorCode, res) {
  var code = errorCode != 'no-index' ? errorCode : 403;
  res.writeHead(code);
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res);
}

module.exports.createGlance = function (options) {
  return new Glance(options);
};

module.exports.Glance = Glance;

  if (require.main === module) {
  c
    .version('0.1.2')
    .option('-d, --dir [dirname]', 'serve files from [dirname] | default cwd')
    .option('-p, --port [num]', 'serve on port [num] | default 61403', parseInt)
    .option('-v, --verbose', 'log connections to console | default off')
    .parse(process.argv);

  new Glance({
    port: c.port,
    dir: c.dir,
    verbose: c.verbose
  }).start();

}

