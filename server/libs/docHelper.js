'use strict';

const Mongoose = require('mongoose');
const Util = require('util');

const proxyHandler = {
  get: function(obj, key) {
    if (obj[key] instanceof Mongoose.Types.Decimal128) {
      return obj[key].toString();
    } else {
      return obj[key];
    }
  }
};

module.exports.prepDocs = docs => {
  if (Array.isArray(docs)) {
    docs = docs.map(prep);
  } else {
    docs = prep(docs);
  }
  return docs;
}

module.exports.valueProxy = doc => {
  if (Array.isArray(doc)) {
    return doc.map(d => {
      if (Util.types.isProxy(d) === true) {
        return d;
      }
      return new Proxy(d, proxyHandler)
    });
  }
  return Util.types.isProxy(doc) === true ? doc : new Proxy(doc, proxyHandler);
}

function prep(doc) {
  if (typeof doc.toObject === 'function') {
    doc = doc.toObject({ virtuals: true });
  }
  doc = deepFieldsToString(doc);
  return doc;
}

function deepFieldsToString(doc) {
  for (const key in doc) {
    const value = doc[key];
    if (Array.isArray(value)) {
      doc[key] = doc[key].map(deepFieldsToString);
    }

    if (typeof doc[key] === 'object' && doc[key] !== null) {
      deepFieldsToString(doc[key]);
    }

    if (doc[key] instanceof Mongoose.Types.ObjectId) {
      doc[key] = value.toString();
    }

    if (doc[key] instanceof Mongoose.Types.Decimal128) {
      doc[key] = value.toString();
    }
  }

  return doc;
}
