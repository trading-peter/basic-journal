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
      }
    ]
  },
  appConfig: {
    accounts: [ 'XBTUSD_LRAIC' ]
  }
};