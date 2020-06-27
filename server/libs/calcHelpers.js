const D = require('decimal.js');
const DateFns = require('date-fns');

module.exports = {
  toNearestHour(date) {
    return DateFns.startOfHour(date);
  },

  calcSlippage(side, avgPrice, candleClosePrice) {
    return side === 'buy' ? D(avgPrice).sub(candleClosePrice) : D(candleClosePrice).sub(avgPrice);
  }
};
