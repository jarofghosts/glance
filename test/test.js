var assert = require('assert'),
    fs = require('fs'),
    glance = require('../index.js'),
    http = require('http')

var glanceServer = glance.createGlance({ port: 1666, dir: './glance-test' })

assert.doesNotThrow(function () {
  glanceServer.start()
})

http.get('http://localhost:1666/file.txt', function (res) {
  var text = ''
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'text/plain')
  res.on('data', function (data) {
    text += data
  })
  res.on('end', function () {
    assert.equal(text, 'howdy!');
    testUri()
  })
})

function testUri() {
  http.get('http://localhost:1666/file%20with%20space.html', function (res) {
    var uritext = ''
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['content-type'], 'text/html')
    res.on('data', function (data) {
      uritext += data
    })
    res.on('end', function () {
      assert.equal(uritext, 'hey, now!')
      testError()
    })
  })
}

function testError() {
  http.get('http://localhost:1666/nofile.md', function (res) {
    assert.equal(res.statusCode, 404)
    testDirList()
  })
}
function testDirList() {
  http.get('http://localhost:1666/', function (res) {
    assert.equal(res.statusCode, 403)
    testIndices()
  })
}
function testIndices() {
  var data = []
  glanceServer.indexing = true
  glanceServer.indices = ['index.html']

  http.get('http://localhost:1666/', function (res) {
    assert.equal(res.statusCode, 200)
    res.on('data', data.push.bind(data))
    res.on('end', function () {
      assert.equal(data.join(''), 'wee\n')
      testMethod()
    })
  })
}
function testMethod() {
  var pass = 0
  ;['POST', 'DELETE', 'PUT'].forEach(function (method) {
    var req = http.request({
      host: 'localhost',
      port: 1666,
      path: '/file.txt',
      method: method
    }, function (res) {
      pass++
      assert.equal(res.statusCode, 405)
      if (pass == 3) {
        glanceServer.stop()
        process.exit(0)
      }
    })
    req.end()
  })
}
