const Mongoose = require('mongoose');
const Joi = require('@hapi/joi');
const TradesModel = require('./tradesModel');
const BalanceModel = require('./balanceModel');

const DB = new class {
  async register(server, options) {
    Joi.assert(options, Joi.object({
      dbUrl: Joi.string().required(),
      tradesModel: Joi.object({
        autoIndex: Joi.boolean()
      }),
      balanceModel: Joi.object({
        autoIndex: Joi.boolean()
      })
    }));

    const conOptions = {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
      useCreateIndex: true,
    };

    server.log([ 'db' ], 'DB enabled');
    await Mongoose.connect(options.dbUrl, conOptions);
    TradesModel.init(server, options.tradesModel);
    BalanceModel.init(server, options.balanceModel);
  }
}

module.exports = {
  name: 'db',
  version: '1.0.0',
  register: DB.register.bind(DB)
};
