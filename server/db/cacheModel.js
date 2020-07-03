const Mongoose = require('mongoose');

class CacheModel {
  init(server, options) {
    if (this._model !== undefined) {
      return this._model;
    }

    this._server = server;
    this._options = options;
    this._setupModel();
    this._model = Mongoose.model('cache', this._schema);
  }

  _setupModel() {
    this._schema = new Mongoose.Schema({
      request:              { type: String, index: true },
      result:               { type: Object },
    }, {
      collection: 'cache',
      autoIndex: this._options.autoIndex,
      toObject: {
        virtuals: true
      },
      toJSON: {
        virtuals: true
      }
    });
  }
}

module.exports = new CacheModel();
