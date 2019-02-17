var http = require('http')

var test = require('tape')

var glance = require('../')

var glanceServer = glance({port: 1666, dir: './test/glance-test', nodot: true})

test('doesnt explode immediately', function(t) {
  t.plan(1)

  t.doesNotThrow(function() {
    glanceServer.start()
  })
})

test('serves plaintext with headers', function(t) {
  http.get('http://localhost:1666/file.txt', function(res) {
    t.plan(3)

    var text = ''

    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-type'], 'text/plain')

    res.on('data', function(data) {
      text += data
    })

    res.on('end', function() {
      t.strictEqual(text, 'howdy!')
    })
  })
})

test('deals with uri encoding', function(t) {
  http.get('http://localhost:1666/file%20with%20space.html', function(res) {
    t.plan(3)

    var uritext = ''

    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-type'], 'text/html')

    res.on('data', function(data) {
      uritext += data
    })

    res.on('end', function() {
      t.strictEqual(uritext, 'hey, now!')
    })
  })
})

test('404s if dot dir with nodot', function(t) {
  t.plan(2)

  http.get('http://localhost:1666/.test/whatever.txt', function(res) {
    t.strictEqual(res.statusCode, 404)
  })

  http.get('http://localhost:1666/test1/.test2/lol.txt', function(res) {
    t.strictEqual(res.statusCode, 404)
  })
})

test('shuts down without exploding', function(t) {
  t.plan(1)

  t.doesNotThrow(function() {
    glanceServer.stop()
  })
})
