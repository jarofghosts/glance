#!/usr/bin/env node
var c = require('commander'),
    fs = require('fs'),
    parse = require('url').parse,
    http = require('http'),
    path = require('path');

c
  .version('0.0.3')
  .option('-d, --dir [dirname]', 'serve files from [dirname] | default cwd')
  .option('-p, --port [num]', 'serve on port [num] | default 61403', parseInt)
  .option('-v, --verbose', 'log connections to console | default off')
  .parse(process.argv);

var port = c.port || 61403,
    dir = c.dir || process.cwd(),
    verbose = c.verbose;

if (!dir.match(/^\//) || dir.match(/^\./)) {
  dir = path.normalize(dir);
}

http.createServer(function (req, res) {
  if (req.method.toLowerCase() != 'get') {
    console.log(req.socket.remoteAddress + ' tried to ' + req.method.toLowerCase() + ' ' + dir + parse(req.url).pathname);
    showError(403, res);
    return;
  }
  var reqPath = parse(req.url).pathname;
  fs.stat(dir + reqPath, function (err, stat) {
    if (err || !stat.isFile()) {
      console.log(req.socket.remoteAddress + ' 404 on ' + dir + reqPath);
      showError(404, res);
      return;
    }
    if (verbose) { console.log(req.socket.remoteAddress + ' reading ' + dir + reqPath); }
    fs.createReadStream(dir + reqPath).pipe(res);
  });
}).listen(port);

function showError(errorCode, res) {
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res);
}
