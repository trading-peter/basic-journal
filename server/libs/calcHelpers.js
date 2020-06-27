const D = require('decimal.js');
const DateFns = require('date-fns');

module.exports = {
  toNearestHour(date) {
    const distDown = Math.abs(DateFns.differenceInMilliseconds(date, DateFns.startOfHour(date)));
    const distUp = Math.abs(DateFns.differenceInMilliseconds(date, DateFns.addMilliseconds(DateFns.endOfHour(date), 1)));

    if (distUp < distDown) {
      return DateFns.addMilliseconds(DateFns.endOfHour(date), 1);
    } else {
      return DateFns.startOfHour(date);
    }
  },

  calcSlippage(side, avgPrice, candleClosePrice) {
    return side === 'buy' ? D(avgPrice).sub(candleClosePrice) : D(candleClosePrice).sub(avgPrice);
  }
};
