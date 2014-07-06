glance
====

[![Build Status](http://img.shields.io/travis/jarofghosts/glance.svg?style=flat)](https://travis-ci.org/jarofghosts/glance)
[![npm install](http://img.shields.io/npm/dm/glance.svg?style=flat)](https://www.npmjs.org/package/glance)

a quick disposable http server for static files

## installation

```bash
npm install -g glance
```

## usage

Run `glance` from within a directory and you are immediately serving the files
from within that directory

If the directory being served has a `.glance.json` file within it,
configuration will be read from that. Failing that, glance will look for a
`~/.glance.json` for directives. Failing **that**, glance will use defaults.
Command line options will always override config file options.

## command line options

`glance [options]`

* `--dir, -d <dir>` serve `<dir>` instead of current directory
* `--help, -h` print help screen with option listing
* `--hideindex, -H` don't serve directory listing
* `--indices, -I` comma-separated file names to use as indices
* `--nodot, -n` hide dot files
* `--port, -p <port>` open server on `<port>` rather than 8080
* `--version, -V` print version information
* `--verbose, -v` enable verbose mode, printing log to stdout

## config format

Your config should be valid json in the following format (shown with defaults):

```json
{
  "port": 8080
  "hideindex": false,
  "dir": "/whatever/dir/you/are/in",
  "verbose": false,
  "indices": ["index.html", "index.htm"],
  "nodot": false
}
```

## as a module

Alternatively, you can `require('glance')` and use it as a module within your
own code.

Some sample code might just look something like this:

```js
var http = require('http')

var glance = require('glance')
// init a glance object with custom options (all totally optional)

var g = glance({
    dir: '../Files' // defaults to current working dir
  , port: 86753 // defaults to 8080
  , indices: [] // use these file names to provide indices
  , hideindex: true // will not provide a directory list if requested
  , nodot: true // will hide dot files from lists and will not serve them
  , verbose: true // defaults to false
})

// just use glance to serve requests if you wanna
http.createServer(function(req, res) {
  if (/^\/static\//.test(req.url)) return g.serveRequest(req, res)
  // pretend i do other stuff here...
}).listen(5309)

// or, use it to start a static file server
g.start()

// listen for read events
g.on('read', function(req) {
  console.dir(req)
  /* req object of format:
    {
        fullPath: 'requested path'
      , ip: 'remote ip address'
      , method: 'requested method'
      , response: 'response object'
    }
  */
})

// listen for error events
g.on('error', function(req) {
  console.log('BAD!!!!')
  // stop the glance server
  g.stop()
})
```

## license

MIT
