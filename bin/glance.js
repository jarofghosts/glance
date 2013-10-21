#!/usr/bin/env node

var Glance = require('../').Glance,
    c = require('commander'),
    path = require('path'),
    globalConfigFile = path.join(
      path.normalize(process.env.HOME || process.env.USERPROFILE),
      '.glance.json'
    ),
    version = require('../package.json').version

try {
  var globalConfig = require(globalConfigFile)
  defaults = xtend(defaults, globalConfig)
} catch (e) {}
try {
  var localConfig = require(path.join(process.cwd(), '.glance.json'))
  defaults = xtend(defaults, localConfig)
} catch (e) {}

c
  .version(version)
  .option('-d, --dir [dirname]',
      'serve files from [dirname] | default cwd')
  .option('-i, --indexing',
      'turn on autoindexing for directory requests | default off')
  .option('-I, --indices <files>',
      'comma-separated list of files considered as an "index"')
  .option('-n, --nodot',
      'do not list or serve dotfiles | default off')
  .option('-p, --port [num]',
      'serve on port [num] | default 61403', parseInt)
  .option('-v, --verbose',
      'log connections to console | default off')
  .parse(process.argv)

var cliOptions = {}

if (c.dir !== undefined) cliOptions.dir = c.dir
if (c.indexing !== undefined) cliOptions.indexing = c.indexing
if (c.indices !== undefined) cliOptions.indices = c.indices.split(',')
if (c.nodot !== undefined) cliOptions.nodot = c.nodot
if (c.port !== undefined) cliOptions.port = c.port
if (c.verbose !== undefined) cliOptions.verbose = c.verbose

new Glance(cliOptions).start()

