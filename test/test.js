var assert = require('assert'),
    fs = require('fs'),
    glance = require('../index.js'),
    glanceServer;

fs.mkdirSync('glance-test');
assert.doesNotThrow(function () { glanceServer = glance.createGlance() });
glanceServer.stop();

