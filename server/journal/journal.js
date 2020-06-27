const Mongoose = require('mongoose');
const Joi = require('@hapi/joi');
const DocHelper = require('../libs/docHelper');
const Cron = require('node-cron');

const Journal = new class {
  async register(server, options) {
    this._server = server;
    this._options = options;

    this.tradesModel = Mongoose.model('trade');
    this.balanceModel = Mongoose.model('balance');

    server.route([
      {
        method: 'POST',
        path: '/stats',
        options: {
          validate: {
            payload: Joi.object({
              account: Joi.string().regex(/^[a-zA-Z0-9_-]+$/).required()
            })
          }
        },
        handler: async request => {
          const { account } = request.payload;
          
          const [ trades, balance ] = await Promise.all([
            this.tradesModel.find({ account }).sort({ date: -1 }),
            this.balanceModel.find({ account }).sort({ date: -1 })
          ]);

          return { trades: DocHelper.prepDocs(trades), balance: DocHelper.prepDocs(balance) };
        }
      }
    ]);

    // Cron.schedule('15 * * * *', () => this._fetchAccounts);
    this._fetchAccounts();
  }

  async _fetchAccounts() {
    const { accounts } = this._options;

    for (const acc of accounts) {
      const exchange = acc.exchange.toLowerCase();
      const lastTrade = await this.tradesModel.findOne({ account: acc.name }).sort({ date: -1 }) || new this.tradesModel({ date: acc.startTime });
      const balanceCount = await this.balanceModel.find({ account: acc.name }).countDocuments();

      const handler = new (require(`./${exchange}/${exchange}`))(acc, this._server, this.tradesModel, this.balanceModel);
      await handler.fetchTradesSince(lastTrade);
      await handler.fetchBalanceHistorySince(balanceCount);
    }
  }
}

module.exports = {
  name: 'journal',
  version: '1.0.0',
  register: Journal.register.bind(Journal)
};
