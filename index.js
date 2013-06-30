#!/usr/bin/env node
var c = require('commander'),
    fs = require('fs'),
    mime = require('mime'),
    parse = require('url').parse,
    http = require('http'),
    path = require('path');

c
  .version('0.0.4')
  .option('-d, --dir [dirname]', 'serve files from [dirname] | default cwd')
  .option('-p, --port [num]', 'serve on port [num] | default 61403', parseInt)
  .option('-v, --verbose', 'log connections to console | default off')
  .parse(process.argv);

new Glance({
  port: c.port,
  dir: c.dir,
  verbose: c.verbose
});

function Glance(options) {

  this.port = options.port || 61403;
  this.dir = options.dir || process.cwd();
  this.verbose = options.verbose;

  if (!this.dir.match(/^\//) || this.dir.match(/^\./)) {
    this.dir = path.normalize(this.dir);
  }

  http.createServer(function (req, res) { 
    var reqPath = parse(req.url).pathname,
        fullPath = this.dir + reqPath,
        ip = req.socket.remoteAddress,
        method = req.method.toLowerCase();
    if (method != 'get') {
      if (this.verbose) { console.log(ip + ' tried to ' + method + ' ' + fullPath); }
      showError(403, res);
      return;
    }
    fs.stat(fullPath, function (err, stat) {
      if (err) {
        if (this.verbose) { console.log(ip + ' 404 on ' + fullPath); }
        showError(404, res);
        return;
      }
      if (stat.isDirectory()) {
        if (this.verbose) { console.log(ip + ' attempt dir list on ' + fullPath); }
        showError('no-index', res);
        return;
      }
      if (this.verbose) { console.log(ip + ' reading ' + fullPath); }
      res.setHeader('Content-Type', mime.lookup(fullPath));
      fs.createReadStream(fullPath).pipe(res);
    }.bind(this));
  }.bind(this)).listen(this.port);
}

function showError(errorCode, res) {
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res);
}

module.exports.createGlance = function (options) {
  return new Glance(options);
};
module.exports.Glance = Glance;
