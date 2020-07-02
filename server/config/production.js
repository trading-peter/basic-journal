module.exports = {
  port: 3000,
  db: {
    dbUrl: 'mongodb://mongodb/basic-journal',
    tradesModel: {
      autoIndex: false
    },
    balanceModel: {
      autoIndex: false
    }
  },
  journal: {
    accounts: [
      {
        name: 'XBTUSD_LRAIC',
        exchange: 'BITMEX',
        symbol: 'XBTUSD',
        startTime: new Date('2019-08-01T00:00:00.000Z'),
        apiKey: process.env.XBTUSD_LRAIC_KEY,
        apiSecret: process.env.XBTUSD_LRAIC_SECRET,
      },
      {
        name: 'ETH_PERP_LRAIC',
        exchange: 'FTX',
        symbol: 'ETH-PERP',
        startTime: new Date('2019-10-19T00:00:00.000Z'),
        apiKey: process.env.ETHPERP_LRAIC_KEY,
        apiSecret: process.env.ETHPERP_LRAIC_SECRET,
        subAccount: process.env.ETHPERP_LRAIC_SUBACCOUNT,
        balance: 100
      }
    ]
  },
  appConfig: {
    accounts: [ 'XBTUSD_LRAIC', 'ETH_PERP_LRAIC' ]
  }
};