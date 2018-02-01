var http = require('http')

var test = require('tape')

var glance = require('../')

var glanceServer = glance({port: 1666, dir: './test/glance-test'})

test('doesnt explode immediately', function (t) {
  t.plan(1)

  t.doesNotThrow(function () {
    glanceServer.start()
  })
})

test('serves plaintext with headers', function (t) {
  http.get('http://localhost:1666/file.txt', function (res) {
    t.plan(3)

    var text = ''

    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-type'], 'text/plain')

    res.on('data', function (data) {
      text += data
    })

    res.on('end', function () {
      t.strictEqual(text, 'howdy!')
    })
  })
})

test('deals with uri encoding', function (t) {
  http.get('http://localhost:1666/file%20with%20space.html', function (res) {
    t.plan(3)

    var uritext = ''

    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-type'], 'text/html')

    res.on('data', function (data) {
      uritext += data
    })

    res.on('end', function () {
      t.strictEqual(uritext, 'hey, now!')
    })
  })
})

test('404s on file not found', function (t) {
  t.plan(1)

  http.get('http://localhost:1666/nofile.md', function (res) {
    t.strictEqual(res.statusCode, 404)
  })
})

test('403s on dir list if configured', function (t) {
  t.plan(1)

  glanceServer.hideindex = true

  http.get('http://localhost:1666/', function (res) {
    glanceServer.hideindex = false
    t.strictEqual(res.statusCode, 403)
  })
})

test('403s if path traversal is attempted', function (t) {
  t.plan(1)

  http.get('http://localhost:1666/../index.js', function (res) {
    t.strictEqual(res.statusCode, 403)
  })
})

test('serves index page', function (t) {
  t.plan(2)

  var data = []

  http.get('http://localhost:1666/', function (res) {
    t.strictEqual(res.statusCode, 200)

    res.on('data', data.push.bind(data))

    res.on('end', function () {
      t.strictEqual(data.join(''), 'wee\n')
    })
  })
})

test('405s on everything but GET', function (t) {
  t.plan(3)

  var badMethods = ['POST', 'DELETE', 'PUT']

  badMethods.forEach(function (method) {
    var options = {
      host: 'localhost',
      port: 1666,
      path: '/file.txt',
      method: method
    }

    var req = http.request(options, verifyCode)

    req.end()
  })

  function verifyCode (res) {
    t.strictEqual(res.statusCode, 405)
  }
})

test('shuts down without exploding', function (t) {
  t.plan(1)

  t.doesNotThrow(function () {
    glanceServer.stop()
  })
})
