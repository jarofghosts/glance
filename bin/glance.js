#!/usr/bin/env node

var path = require('path')
  , fs = require('fs')

var xtend = require('xtend')
  , nopt = require('nopt')

var defaults = require('../lib/config')
  , Glance = require('../')

var globalConfigFile = path.join(
    path.normalize(process.env.HOME || process.env.USERPROFILE)
  , '.glance.json'
)

var noptions = {
    dir: String
  , indexing: Boolean
  , indices: String
  , nodot: Boolean
  , port: Number
  , verbose: Boolean
  , help: Boolean
  , version: Boolean
}

var shorts = {
    d: ['--dir']
  , i: ['--indexing']
  , I: ['--indices']
  , n: ['--nodot']
  , p: ['--port']
  , v: ['--verbose']
  , h: ['--help']
  , V: ['--version']
}

var glanceVersion = require('../package.json').version

try {
  var globalConfig = require(globalConfigFile)
  defaults = xtend(defaults, globalConfig)
} catch (e) {}
try {
  var localConfig = require(path.join(process.cwd(), '.glance.json'))
  defaults = xtend(defaults, localConfig)
} catch (e) {}

var options = nopt(noptions, shorts, process.argv)

if(options.help) return help()
if(options.version) return version()

if(options.indices) options.indices = options.indices.split(',')

options = xtend(defaults, options)

new Glance(options).start()

function help() {
  version()
  fs.createReadStream(path.join(__dirname, '..', 'help.txt'))
    .pipe(process.stderr)
}

function version() {
  console.log('glance version ' + glanceVersion)
}
