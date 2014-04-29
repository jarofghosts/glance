var http = require('http')
  , fs = require('fs')

var test = require('tape')

var glance = require('../index.js')

var glanceServer = glance.createGlance({port: 1666, dir: './test/glance-test'})

test('doesnt explode immediately', function (t) {
  t.plan(1)

  t.doesNotThrow(function () {
    glanceServer.start()
  })
})

test('serves plaintext with headers', function(t) {
  http.get('http://localhost:1666/file.txt', function (res) {
    t.plan(3)

    var text = ''

    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-type'], 'text/plain')

    res.on('data', function (data) {
      text += data
    })

    res.on('end', function () {
      t.strictEqual(text, 'howdy!');
    })
  })
})

test('deals with uri encoding', function(t) {
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

test('404s on file not found', function(t) {
  t.plan(1)

  http.get('http://localhost:1666/nofile.md', function (res) {
    t.strictEqual(res.statusCode, 404)
  })
})

test('403s on dir list if not configured', function(t) {
  t.plan(1)

  http.get('http://localhost:1666/', function (res) {
    t.strictEqual(res.statusCode, 403)
  })
})

test('serves index page', function(t) {
  t.plan(2)

  var data = []

  glanceServer.indexing = true
  glanceServer.indices = ['index.html']

  http.get('http://localhost:1666/', function (res) {
    t.strictEqual(res.statusCode, 200)

    res.on('data', data.push.bind(data))

    res.on('end', function () {
      t.strictEqual(data.join(''), 'wee\n')
    })
  })
})

test('405s on everything but GET', function(t) {
  t.plan(3)

  var bad_methods = ['POST', 'DELETE', 'PUT']

  bad_methods.forEach(function(method) {
    var options
      , req
    
    options = {
        host: 'localhost'
      , port: 1666
      , path: '/file.txt'
      , method: method
    }
  
    req = http.request(options, verify_code)

    req.end()
  })

  function verify_code(res) {
    t.strictEqual(res.statusCode, 405)
  }
})

test('shuts down without exploding', function(t) {
  t.plan(1)

  t.doesNotThrow(function() {
    glanceServer.stop()
  })
})
