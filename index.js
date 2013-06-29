var c = require('commander'),
    fs = require('fs'),
    parse = require('url').parse,
    http = require('http');

c
  .version('0.0.0')
  .option('-d, --dir [dirname]', 'serve files from [dirname] | default cwd')
  .option('-p, --port [num]', 'serve on port [num] | default 61403', parseInt)
  .option('-v, --verbose', 'log connections to console | default off')
  .parse(process.argv);

var port = c.port || 61403,
    dir = c.dir || process.cwd(),
    verbose = c.verbose;

http.createServer(function (req, res) {
  if (req.method.toLowerCase() != 'get') {
    showError(403, res);
    return;
  }
  var reqPath = parse(req.url).pathname;
  fs.exists(dir + reqPath, function (exists) {
    if (!exists) {
      showError(404, res);
      return;
    }
    fs.createReadStream(dir + reqPath).pipe(res);
  });
}).listen(port);

function showError(errorCode, res) {
  fs.createReadStream('../errors/' + errorCode + '.html').pipe(res);
}
