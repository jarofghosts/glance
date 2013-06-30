var assert = require('assert'),
    fs = require('fs'),
    glance = require('../index.js'),
    http = require('http');

fs.mkdirSync('glance-test');
fs.writeFileSync('glance-test/file.txt', 'howdy!');

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
    testError();
  });
});
function testError() {
  http.get('http://localhost:16661/nofile.md', function (res) {
    assert.equal(res.statusCode, 404);
    res.on('data', function (data) {})
    res.on('end', tearDown);
  });
}
function tearDown() {
  glanceServer.stop();
  fs.unlinkSync('glance-test/file.txt');
  fs.rmdirSync('glance-test');
}
