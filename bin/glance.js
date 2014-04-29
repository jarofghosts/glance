#!/usr/bin/env node

var path = require('path')
  , fs = require('fs')

var xtend = require('xtend')
  , nopt = require('nopt')

var glance = require('../')

var Glance = glance.Glance
  , defaults = glance.defaults

var global_configFile = path.join(
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

var glance_version = require('../package.json').version

try {
  var global_config = require(globalConfigFile)
  defaults = xtend(defaults, global_config)
} catch (e) {}
try {
  var local_config = require(path.join(process.cwd(), '.glance.json'))
  defaults = xtend(defaults, local_config)
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
    .pipe(process.stdout)
}

function version() {
  console.log('glance version ' + glance_version)
}
