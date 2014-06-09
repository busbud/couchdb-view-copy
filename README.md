# couchdb-view-copy

Utility to copy views when CouchDB replication won't do it for you

## Usage

```sh
Usage: node ./index.js --source [url] --destination [url] [--pattern string]

Options:
  -s, --source       source CouchDB db url                                                           [required]
  -d, --destination  destination CouchDB db url                                                      [required]
  -p, --pattern      optional string to match in view names to copy (pattern contained in view url)
  -w, --warmup       optional boolean to start calculating the views                               
```

### Example

```sh
node index.js \
  --source http:///sourcehost/source-db \
  --destination http:///destinationhost/destination-db
  --warmup
```

