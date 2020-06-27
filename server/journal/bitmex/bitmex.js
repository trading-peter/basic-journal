const Api = require('./api');
const D = require('decimal.js');
const DateFns = require('date-fns');
const RateLimiter = require('limiter').RateLimiter;
const DocHelper = require('../../libs/docHelper');
const { toNearestHour, calcSlippage } = require('../../libs/calcHelpers');
const { asyncRemoveTokens } = require('../../libs/misc');

class BitMEX {
  constructor(account, server, tradesModel, balanceModel) {
    this._server = server;
    this._account = account;
    this._tradesModel = tradesModel;
    this._balanceModel = balanceModel;
    this._limiter = new RateLimiter(60, 'minute');
    this._acc = account;
    this._api = new Api({
      key: account.apiKey,
      secret: account.apiSecret
    });

    // Current trade the script is constructing from order history.
    this._currTrade = null;
  }

  async fetchBalanceHistorySince(balanceCount) {
    for await (const rec of this._yieldBalance(balanceCount)) {
      if (!await this._balanceModel.findOne({ recId: rec.recId })) {
        await (new this._balanceModel({ ...rec, account: this._acc.name, symbol: this._acc.symbol })).save();
      }
    }
  }

  async fetchTradesSince(lastTrade) {
    let trade = DocHelper.valueProxy(lastTrade);
    let seen = new Set();

    if (lastTrade.orderId) {
      seen.add(lastTrade.orderId);
    }

    if (lastTrade.orderIdClose) {
      seen.add(lastTrade.orderIdClose);
    }

    for await (const rec of this._yieldTrades(lastTrade)) {
      const isFunding = rec.funding !== undefined;

      if (seen.has(rec.orderId)) continue;
      seen.add(rec.orderId);

      if (isFunding && !trade.orderId) continue;

      if (!trade.orderId) {
        trade.set(rec);
        continue;
      }

      if (isFunding) {
        trade.funding = D(trade.funding || 0).add(rec.funding);
        continue;
      }

      if (trade.closed === false && rec.side !== trade.side) {
        trade.closed = true;
        trade.dateClose = rec.date;
        trade.orderIdClose = rec.orderId;
        trade.avgPriceClose = rec.avgPrice;
        trade.fee = D(trade.fee || 0).add(rec.fee);
        trade.rawPnl = trade.side === 'sell' ? D(rec.amount).sub(trade.amount) : D(trade.amount).sub(rec.amount);
        trade.pnl = D(trade.rawPnl).sub(trade.fee).add(trade.funding || 0);

        // We use the side property of rec (not from trade) to get the slippage of the counter trade that closes the position.
        const closeTradePrice = await this._getCandleClose(this._acc.symbol, toNearestHour(rec.date));
        trade.closeSlippage = calcSlippage(rec.side, rec.avgPrice, closeTradePrice);

        if (!await this._tradesModel.findOne({ orderId: trade.orderId })) {
          await trade.save();
        } else {
          this._server.log([ 'warning' ], `Trade ${trade.orderId} already saved. Skipping.`);
        }
        continue;
      }

      if (trade.closed === false && rec.side.toLowerCase() === trade.side) {
        this._server.log([ 'error' ], `Irregular order detected`);
        this._server.log([ 'error' ], rec);
      }

      if (trade.closed === true) {
        trade = DocHelper.valueProxy(new this._tradesModel({ ...rec, account: this._acc.name, symbol: this._acc.symbol }));
        trade.candleCloseDate = toNearestHour(trade.date);
        trade.candleClosePrice = await this._getCandleClose(this._acc.symbol, trade.candleCloseDate);
        trade.openSlippage = calcSlippage(rec.side, trade.avgPrice, trade.candleClosePrice);
        trade.fee = rec.fee;
      }
    }
  }

  async *_yieldTrades(lastTrade) {
    let lastDate = lastTrade.dateClose || lastTrade.date;

    while (true) {
      await asyncRemoveTokens(1, this._limiter);

      const { data } = await this._api.request({ method: 'GET', path: '/execution/tradeHistory', data: {
        symbol: this._account.symbol,
        startTime: this._toDate(lastDate)
      }});

      for (const rec of data) {
        const order = this._prepTradeData(rec);
        if (!order) continue;
        yield order;
        lastDate = order.date;
      }

      if (data.length < 100) {
        return;
      }
    }
  }

  async *_yieldBalance(balanceCount) {
    let start = balanceCount;

    while (true) {
      await asyncRemoveTokens(1, this._limiter);

      const { data } = await this._api.request({ method: 'GET', path: '/user/walletHistory', data: {
        symbol: this._account.symbol,
        count: 100,
        start
      } });

      for (const entry of data) {
        const rec = this._prepBalanceData(entry);
        if (!rec) continue;
        yield rec;
      }

      start += 100;
  
      if (data.length < 100) {
        return;
      }
    }
  }

  _toDate(date) {
    return DateFns.format(date, 'yyyy-MM-dd HH:mm');
  }

  _prepBalanceData(entry) {
    if (entry.transactStatus !== 'Completed') return null;

    return {
      recId: entry.transactID,
      balance: D(entry.walletBalance).div(100000000),
      date: new Date(entry.transactTime)
    };
  }

  _prepTradeData(order) {
    if (order.ordStatus !== 'Filled') return null;

    if (order.execType === 'Trade') {
      const amount = D(order.orderQty).div(order.price);
  
      return {
        orderId: order.orderID,
        amount: amount,
        side: order.side.toLowerCase(),
        avgPrice: order.avgPx,
        fee: D.abs(amount.mul(order.commission)),
        date: new Date(order.timestamp)
      };
    }

    if (order.execType === 'Funding') {
      return {
        orderId: order.execID,
        date: new Date(order.timestamp),
        funding: D(order.commission).mul(D(order.orderQty).div(order.price)).mul(-1)
      }
    }
  }

  async _getCandleClose(symbol, closeTime) {
    if (closeTime instanceof Date === false) {
      closeTime = new Date(closeTime);
    }

    const since = DateFns.subMinutes(closeTime.getTime(), 1).toISOString();

    await asyncRemoveTokens(1, this._limiter);

    const candles = await this._api.request({ method: 'GET', path: `/trade/bucketed`, data: {
      binSize: '1m',
      partial: false,
      symbol,
      count: 10,
      startTime: since
    } });

    const closeIsoTime = closeTime.toISOString();
    const candle = candles.data.find(c => c.timestamp === closeIsoTime) || {};
    return parseFloat(candle.close);
  }
}

module.exports = BitMEX;
