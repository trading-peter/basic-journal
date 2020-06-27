const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;
const Decimal = Schema.Types.Decimal128;

class BalanceModel {
  init(server, options) {
    if (this._model !== undefined) {
      return this._model;
    }

    this._server = server;
    this._options = options;
    this._setupModel();
    this._model = Mongoose.model('balance', this._schema);
  }

  _setupModel() {
    this._schema = new Mongoose.Schema({
      recId:                { type: String, index: true },
      account:              { type: String, index: true },
      balance:              { type: Decimal },
      date:                 { type: Date, index: true }
    }, {
      collection: 'balances',
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

module.exports = new BalanceModel();
