#!/usr/bin/env node
'use strict';

var SetupAgent = require('./lib/setup-agent');
var async      = require('async');

var argv = require('yargs')
  .usage('Usage: $0 --source [url] --destination [url] [--pattern string]')
  .options({
    s: {
      alias: 'source',
      describe: 'source CouchDB db url',
      demand: true
    },
    d: {
      alias: 'destination',
      describe: 'destination CouchDB db url',
      demand: true
    },
    p: {
      alias: 'pattern',
      describe: 'optional string to match in view names to copy (pattern contained in view url)'
    },
    w: {
      alias: 'warmup',
      describe: 'optional boolean to start calculating the views',
      boolean: true
    }
  })
  .argv;


// Use this script to pull couchdb views from one CouchDB server to another
var agent = new SetupAgent(argv.source, argv.destination, argv.pattern);

var cmds = [
  agent.createDb.bind(agent),
  agent.pickViews.bind(agent),
  agent.copyViews.bind(agent)
];

if (argv.warmup) {
  cmds.push(agent.warmUpViews.bind(agent));
}

async.waterfall(
  cmds,
  function end(err) {
    if (err) {
      console.error(err.stack);
      process.exit(-1);
      return;
    }

    console.log('Replicated');
    process.exit(0);
  }
);