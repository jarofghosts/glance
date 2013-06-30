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
        reqPath: parse(req.url).pathname,
        fullPath: this.dir + reqPath,
        ip: req.socket.remoteAddress,
        method: req.method.toLowerCase(),
        response: res
    };
    if (request.method != 'get') {
      this.emit('error', 403, request);
      return;
    }
    fs.stat(fullPath, function (err, stat) {
      if (err) {
        this.emit('error', 404, request);
        return;
      }
      if (stat.isDirectory()) {
        this.emit('error', 'no-index', request);
        return;
      }
      this.emit('read', request);
      
      res.setHeader('Content-Type', mime.lookup(fullPath));
      fs.createReadStream(fullPath).pipe(res);
    
    }.bind(this));

  }.bind(this)).listen(this.port);

};

Glance.prototype.stop = function () {
  this.server.close();
};

function showError(errorCode, res) {
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res);
}

module.exports.createGlance = function (options) {
  return new Glance(options);
};

module.exports.Glance = Glance;

  if (require.main === module) {
  c
    .version('0.0.5')
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

