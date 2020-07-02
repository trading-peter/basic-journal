const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;
const Decimal = Schema.Types.Decimal128;

class TradesModel {
  init(server, options) {
    if (this._model !== undefined) {
      return this._model;
    }

    this._server = server;
    this._options = options;
    this._setupModel();
    this._model = Mongoose.model('trade', this._schema);
  }

  _setupModel() {
    this._schema = new Mongoose.Schema({
      orderId:              { type: String, index: true },
      orderIdClose:         { type: String },
      account:              { type: String, index: true },
      symbol:               { type: String },
      amount:               { type: Decimal },
      avgPrice:             { type: Decimal },
      avgPriceClose:        { type: Decimal },
      fee:                  { type: Decimal },
      side:                 { type: String },
      date:                 { type: Date, index: true },
      dateClose:            { type: Date, index: true },
      rawPnl:                  { type: Decimal },
      pnl:                  { type: Decimal },
      funding:              { type: Decimal },
      balance:              { type: Decimal },
      openSlippage:         { type: Decimal },
      closeSlippage:        { type: Decimal },
      candleClosePrice:     { type: Decimal },
      candleCloseDate:      { type: Date },
      closed:               { type: Boolean, default: false },
    }, {
      collection: 'trades',
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

module.exports = new TradesModel();
