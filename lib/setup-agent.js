'use strict';

var request = require('request');
var async   = require('async');
var URIjs   = require('URIjs');
var _       = require('lodash');

var SetupAgent = module.exports = function (source, destination, pattern) {
  this.sourceCouch = new URIjs(source);
  this.destinationCouch = new URIjs(destination);
  this.pattern = pattern;
  this.docs = {};
};

SetupAgent.prototype.createDb = function(next) {
  request.put(this.destinationCouch.clone().href(), function (err) {
    if (err) {
      next(err);
    }

    next();
  });
};

SetupAgent.prototype.pickViews = function (next) {
  var self = this;
  var uri  = this.sourceCouch
    .clone()
    .segment('_all_docs')
    .query({
      startkey: '"_design"',
      endkey:   '"_design~"'
    })
    .href();

  console.log('Looking for views at %s', uri);

  request.get(uri, function (err, res, body) {
    if (err) {
      return next(err);
    }

    console.log('Found views: %s', body);
    console.log(next);

    next(null, self.ids(JSON.parse(body).rows));
  });
};

SetupAgent.prototype.copyViews = function(ids, next) {
  var self = this;

  function copy (id, next) {
    var url = self.sourceCouch.clone().segment(id).href();

    request.get(url, function(err, res, body) {
      if (err) {
        return next(err);
      }

      var doc  = JSON.parse(body);
      delete doc._rev;
      self.docs[id] = doc;

      var opts = {
        uri: self.destinationCouch.clone().segment(id).href(),
        json: doc
      };

      request.put(opts, function(err /*, res, body */) {
        if (!err) {
          console.log('Copied %s', id);
        }

        next(err);
      });
    });
  }

  async.forEach(
    ids,
    copy,
    next
  );
};

SetupAgent.prototype.warmUpViews = function(next) {
  var self = this;

  var urls = _(self.docs)
    .chain()
    .map(function (doc, id) {
      // view urls
      return _(doc.views)
        .chain()
        .keys()
        .map(function (view) {
          var segments = self.destinationCouch.segment();
          segments.push(id, '_view', view);

          return self.destinationCouch.clone()
            .segment(segments)
            .search({stale: 'update_after', limit: 1})
            .href();
        })
        .value();
    })
    .flatten()
    .value();

  function warmup (url, next) {
    request.get({uri: url}, function(err /*, res, body */) {
      if (!err) {
        console.log('Warmed up %s', new URIjs(url).path());
      }

      next(err);
    });
  }

  console.log('Warming up views');

  async.each(
    urls,
    warmup,
    next
  );
};

SetupAgent.prototype.ids = function (rows) {
  var self = this;
  var ids = rows;

  if (self.pattern) {
    ids = _.chain(rows)
      .pluck('key')
      .filter(function (id) {
        return id.indexOf(self.pattern) !== -1;
      })
      .value();
  }

  return ids;
};