var http = require('http')

var test = require('tape')

var glance = require('../')

var glanceServer = glance({port: 1666, dir: './test/glance-test', nodot: true})

test('doesnt explode immediately', function (t) {
  t.plan(1)

  t.doesNotThrow(function () {
    glanceServer.start()
  })
})

test('404s if dot dir with nodot', function (t) {
  t.plan(2)

  http.get('http://localhost:1666/.test/whatever.txt', function (res) {
    t.strictEqual(res.statusCode, 404)
  })

  http.get('http://localhost:1666/test1/.test2/lol.txt', function (res) {
    t.strictEqual(res.statusCode, 404)
  })
})

test('shuts down without exploding', function (t) {
  t.plan(1)

  t.doesNotThrow(function () {
    glanceServer.stop()
  })
})
