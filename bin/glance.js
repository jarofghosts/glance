#!/usr/bin/env node

var path = require('path')
  , fs = require('fs')

var color = require('bash-color')
  , xtend = require('xtend')
  , nopt = require('nopt')

var defaults = require('../lib/config')
  , Glance = require('../')

var globalConfigFile = path.join(
    path.normalize(process.env.HOME || process.env.USERPROFILE)
  , '.glance.json'
)

var glance

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

glance = new Glance(options)

glance.start()

glance.on('read', onRead)
glance.on('error', onError)
glance.on('started', onStarted)

function onStarted() {
  if(!options.verbose) return

  console.log(
      color.purple('glance') + ' serving ' + color.yellow(this.dir, true) +
      ' on port ' + color.green(this.port)
  )
}

function onRead(request) {
  if(!this.options) return

  console.log(
     color.green(request.ip) + ' read ' +
     color.yellow(request.fullPath, true)
  )
}

function onError(errorCode, request) {
  if(!options.verbose) return

  console.log(
      color.red('ERR' + errorCode) + ' ' + request.ip + ' on ' + 
      color.yellow(request.fullPath, true)
  )
}

function help() {
  version()
  fs.createReadStream(path.join(__dirname, '..', 'help.txt'))
    .pipe(process.stderr)
}

function version() {
  console.log('glance version ' + glanceVersion)
}
