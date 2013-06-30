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

var port = c.port || 61403,
    dir = c.dir || process.cwd(),
    verbose = c.verbose;

if (!dir.match(/^\//) || dir.match(/^\./)) {
  dir = path.normalize(dir);
}

http.createServer(function (req, res) { 
  var reqPath = parse(req.url).pathname,
      fullPath = dir + reqPath,
      ip = req.socket.remoteAddress,
      method = req.method.toLowerCase();
  if (method != 'get') {
    if (verbose) { console.log(ip + ' tried to ' + method + ' ' + fullPath); }
    showError(403, res);
    return;
  }
  fs.stat(fullPath, function (err, stat) {
    if (err || !stat.isFile()) {
      if (verbose) { console.log(ip + ' 404 on ' + fullPath); }
      showError(404, res);
      return;
    }
    if (verbose) { console.log(ip + ' reading ' + fullPath); }
    res.setHeader('Content-Type', mime.lookup(fullPath));
    fs.createReadStream(dir + reqPath).pipe(res);
  });
}).listen(port);

function showError(errorCode, res) {
  fs.createReadStream(__dirname + '/errors/' + errorCode + '.html').pipe(res);
}

