var assert = require('assert'),
    fs = require('fs'),
    glance = require('../index.js'),
    http = require('http');

fs.mkdirSync('glance-test');
fs.writeFileSync('glance-test/file.txt', 'howdy!');
fs.writeFileSync('glance-test/file with space.html', 'hey, now!');

var glanceServer = glance.createGlance({ port: 16661, dir: './glance-test' });

assert.doesNotThrow(function () {
  glanceServer.start()
});

http.get('http://localhost:16661/file.txt', function (res) {
  var text = '';
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'text/plain');
  res.on('data', function (data) {
    text += data;
  });
  res.on('end', function () {
    assert.equal(text, 'howdy!');
    testUri();
  });
});
function testUri() {
  http.get('http://localhost:16661/file%20with%20space.html', function (res) {
    var uritext = '';
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'text/html');
    res.on('data', function (data) {
      uritext += data;
    });
    res.on('end', function () {
      assert.equal(uritext, 'hey, now!');
      testError();
    });
  });
}
function testError() {
  http.get('http://localhost:16661/nofile.md', function (res) {
    assert.equal(res.statusCode, 404);
    res.on('data', function (data) {})
    res.on('end', testDirList);
  });
}
function testDirList() {
  http.get('http://localhost:16661/', function (res) {
    assert.equal(res.statusCode, 403);
    res.on('data', function () {});
    res.on('end', testMethod);
  });
}
function testMethod() {
  ['POST', 'DELETE', 'PUT'].forEach(function (method) {
    var req = http.request({
      host: 'localhost',
      port: 16661,
      path: '/file.txt',
      method: method
    }, function (res) {
      assert.equal(res.statusCode, 405);
      res.on('data', function () {});
    });
    req.on('error', function (e) {
      console.log(e);
    });
    req.end();
  });
  setTimeout(tearDown, 500);
}
function tearDown() {
  glanceServer.stop();
  fs.unlinkSync('glance-test/file.txt');
  fs.unlinkSync('glance-test/file with space.html');
  fs.rmdirSync('glance-test');
}
