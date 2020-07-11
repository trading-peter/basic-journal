const Api = require('./api');
const D = require('decimal.js');
const DateFns = require('date-fns');
const DocHelper = require('../../libs/docHelper');
const { toNearestHour, calcSlippage } = require('../../libs/calcHelpers');

class FTX {
  constructor(account, server, tradesModel, balanceModel, cacheModel) {
    this._server = server;
    this._account = account;
    this._tradesModel = tradesModel;
    this._balanceModel = balanceModel;
    this._acc = account;
    this._api = new Api({
      key: account.apiKey,
      secret: account.apiSecret,
      subaccount: account.subAccount,
      cacheModel: account.cache ? cacheModel : null
    });
  }

  async fetchTradesSince(lastTrade) {
    // const r = await this._api.request({ method: 'GET', path: '/wallet/deposits'});

    let trade = DocHelper.valueProxy(lastTrade);
    let balance = D(trade.balance || this._acc.balance || 0);
    
    let seen = new Set();

    // Amount of orders that belong to the current trade. Used to calculate averages.
    let openOrderCount = 1;

    // Count how many orders were used to close the trade. Used to calculate averages.
    let closeOrderCount = 0;

    // Keep track of the position value (not amount) to determine when the position was fully closed.
    // Needed to find out when the right count of closing orders was processed and when the new position is being filled.
    let tradeClosedValue = D(0);
    
    for await (const rec of this._yieldTrades(lastTrade)) {
      if (this._wasProcessed(rec, trade)) continue;

      const isFunding = this._isFunding(rec);
      
      if (seen.has(rec.orderId.toString())) continue;
      seen.add(rec.orderId.toString());
      
      if (isFunding && trade.orderId) {
        trade.funding = D(trade.funding || 0).add(rec.funding);
        continue;
      }

      if (!trade.orderId) {
        trade.set(rec);
        continue;
      }

      if (trade.closed === false && rec.side !== trade.side) {
        closeOrderCount++;

        trade.avgPriceClose = D(trade.avgPriceClose || 0).add(rec.avgPrice);
        trade.fee = D(trade.fee || 0).add(rec.fee);
        
        tradeClosedValue = D(tradeClosedValue).add(rec.amount);
        
        if (tradeClosedValue.gte(trade.amount)) {
          trade.avgPrice = D(trade.avgPrice).div(openOrderCount);
          trade.candleCloseDate = toNearestHour(trade.date);
          trade.candleClosePrice = await this._getCandleClose(this._acc.symbol, trade.candleCloseDate);
          trade.openSlippage = calcSlippage(trade.side, trade.avgPrice, trade.candleClosePrice);

          trade.dateClose = rec.date;
          trade.orderIdClose = rec.orderId;

          trade.closed = true;
          trade.avgPriceClose = D(trade.avgPriceClose || 0).div(closeOrderCount);
          const closeVal = D(trade.amount).mul(trade.avgPriceClose);
          const openVal = D(trade.amount).mul(trade.avgPrice);
          trade.rawPnl = trade.side === 'buy' ? D(closeVal).sub(openVal) : D(openVal).sub(closeVal);
          trade.pnl = D(trade.rawPnl).sub(trade.fee).add(trade.funding || 0);
          balance = balance.add(trade.pnl);
          trade.balance = balance;
          
          // We use the side property of rec (not from trade) to get the slippage of the counter trade that closes the position.
          const closeTradePrice = await this._getCandleClose(this._acc.symbol, toNearestHour(rec.date));
          trade.closeSlippage = calcSlippage(rec.side, trade.avgPriceClose, closeTradePrice);
          
          if (!await this._tradesModel.findOne({ orderId: trade.orderId })) {
            await trade.save();
          } else {
            this._server.log([ 'warning', this._account.name ], `Trade ${trade.orderId} already saved. Skipping.`);
          }

          const diff = D(trade.amount).sub(tradeClosedValue).abs();
          
          if (diff.gt(0)) {
            rec.amount = diff;
            trade = DocHelper.valueProxy(new this._tradesModel({ ...rec, account: this._acc.name, symbol: this._acc.symbol }));
            openOrderCount = 1;
            closeOrderCount = 0;
          }

          tradeClosedValue = D(0);
        }

        continue;
      }

      // Add to current trade if record has same direction and is within 1 minute as trade itself.
      if (trade.closed === false && rec.side === trade.side) {
        trade.fee = D(trade.fee || 0).add(rec.fee);
        trade.amount = D(trade.amount).add(rec.amount);
        trade.avgPrice = D(trade.avgPrice).add(rec.avgPrice);

        openOrderCount++;
      }

      if (trade.closed === true) {
        trade = DocHelper.valueProxy(new this._tradesModel({ ...rec, account: this._acc.name, symbol: this._acc.symbol }));
        openOrderCount = 1;
        closeOrderCount = 0;
        tradeClosedValue = D(0);
      }
    }
  }

  async *_yieldTrades(lastTrade) {
    let lastDate = lastTrade.dateClose || lastTrade.date;

    while (true) {
      const startTime = lastDate.getTime() / 1000;
      const endTime = DateFns.addDays(lastDate, 1).getTime() / 1000;

      // // Can be used to determine the start of the fill history.
      // const test = await this._api.request({ method: 'GET', path: '/fills', data: {
      //   market: this._account.symbol,
      //   limit: 100,
      //   end_time: new Date('2019-10-20T00:00:00Z').getTime() / 1000
      // }});

      // console.log(test);

      const [ fills, funding ] = await Promise.all([
        this._api.request({ method: 'GET', path: '/fills', data: {
          market: this._account.symbol,
          limit: 100,
          start_time: Math.floor(startTime),
          end_time: Math.floor(endTime),
          order: 'asc'
        }}),
        this._api.request({ method: 'GET', path: '/funding_payments', data: {
          market: this._account.symbol,
          limit: 100,
          start_time: Math.floor(startTime),
          end_time: Math.floor(endTime)
        }})
      ]);

      const recs = [ ...fills.result, ...funding.result ];
      recs.sort((a, b) => DateFns.isBefore(new Date(a.time), new Date(b.time)) ? -1 : 1);

      for (const rec of recs) {
        const order = this._prepTradeData(rec);
        if (!order) continue;
        yield order;
      }

      lastDate = DateFns.addDays(lastDate, 1);

      if (DateFns.isAfter(lastDate, new Date())) {
        this._server.log([ 'ftx', this._account.name ], `All trades fetched`);
        return;
      }
    }
  }

  _wasProcessed(rec, trade) {
    if (!trade.orderId) return false;
    const date = trade.dateClose || trade.close;
    return DateFns.isBefore(rec.date, date) || DateFns.isEqual(rec.date, date);
  }

  _isFunding(rec) {
    return rec.funding !== undefined;
  }

  _prepTradeData(order) {
    if (order.payment !== undefined) {
      return {
        orderId: order.id,
        date: new Date(order.time),
        funding: D(order.payment).mul(-1)
      };
    }

    return {
      orderId: order.id,
      amount: order.size,
      side: order.side.toLowerCase(),
      avgPrice: order.price,
      fee: order.fee,
      date: new Date(order.time)
    };
  }

  async _getCandleClose(symbol, closeTime) {
    if (closeTime instanceof Date === false) {
      closeTime = new Date(closeTime);
    }

    const openTime = DateFns.subMinutes(closeTime.getTime(), 1);
    const since = openTime.getTime();
    const resolution = 60;

    const candles = await this._api.request({ method: 'GET', path: `/futures/${symbol.toUpperCase()}/mark_candles`, data: { resolution, limit: 60, end_time: since / 1000 } });
    const candle = candles.result.find(c => c.time === since) || {};
    return parseFloat(candle.close);
  }
}

module.exports = FTX;
