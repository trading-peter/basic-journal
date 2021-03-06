const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const RateLimiter = require('limiter').RateLimiter;
const { asyncRemoveTokens } = require('../../libs/misc');

const version = '1.0.0';
const name = 'ftx-rest-api';

const USER_AGENT = `${name}@${version}`;

class FTXRest {
  constructor(config) {
    this.ua = USER_AGENT;
    this.timeout = 90 * 1000;
    this.limiter = new RateLimiter(29, 'second');

    this.agent = new https.Agent({
      keepAlive: true,
      timeout: 90 * 1000,
      keepAliveMsecs: 1000 * 60
    });

    if(!config) {
      return;
    }

    if(config.key && config.secret) {
      this.key = config.key;
      this.secret = config.secret;
    }

    if(config.timeout) {
      this.timeout = config.timeout;
    }

    if(config.subaccount) {
      this.subaccount = config.subaccount;
    }

    if(config.userAgent) {
      this.ua += ' | ' + config.userAgent;
    }

    if (config.cacheModel) {
      this.cacheModel = config.cacheModel;
    }
  }

  // this fn can easily take more than 0.15ms due to heavy crypto functions
  // if your application is _very_ latency sensitive prepare the drafts
  // before you realize you want to send them.
  createDraft({path, method, data, timeout}) {
    if(!timeout) {
      timeout = this.timeout;
    }

    path = '/api' + path;

    let payload = '';
    if(method === 'GET' && data) {
      path += '?' + querystring.stringify(data);
    } else if(method === 'DELETE') {
      // cancel order or cancel all
      path += data;
    } else if(data) {
      payload = JSON.stringify(data);
    }

    let headers = {
      'User-Agent': this.ua,
      'content-type' : 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (this.secret) {
      const start = +new Date;

      const signature = crypto.createHmac('sha256', this.secret)
        .update(start + method + path + payload).digest('hex');

      headers = {
        ...headers,
        'FTX-TS': start,
        'FTX-KEY': this.key,
        'FTX-SIGN': signature
      }
    }

    const options = {
      host: 'ftx.com',
      path: path,
      method,
      agent: this.agent,
      headers,
      // merely passed through for requestDraft
      timeout,
      payload
    };

    if(this.subaccount) {
      options.headers['FTX-SUBACCOUNT'] = this.subaccount;
    }

    return options;
  }

  // a draft is an option object created (potentially previously) with createDraft
  async requestDraft(draft) {
    if (this.cacheModel) {
      const cacheItem = await this.cacheModel.findOne({ request: draft.path });

      if (cacheItem) {
        return cacheItem.result;
      }
    }

    await asyncRemoveTokens(1, this.limiter);

    return new Promise((resolve, reject) => {
      const req = https.request(draft, res => {
        res.setEncoding('utf8');
        let buffer = '';
        res.on('data', function(data) {
          // TODO: we receive this event up to ~0.6ms before the end
          // event, though if this is valid json & doesn't contain
          // an error we can return from here, since we dont care
          // about status code.
          buffer += data;
        });
        res.on('end', async () => {
          if (res.statusCode >= 300) {
            let message;
            let data;

            try {
              data = JSON.parse(buffer);
              message = data
            } catch(e) {
              message = buffer;
            }

            return reject(message);
          }

          let data;
          try {
            data = JSON.parse(buffer);
          } catch (err) {
            console.error('JSON ERROR!', buffer);
            return reject(new Error('Json error'));
          }

          if (this.cacheModel) {
            await this.cacheModel.insertMany([{ request: draft.path, result: data }]);
          }

          resolve(data);
        });
      });

      req.on('error', err => {
        reject(err);
      });

      req.on('socket', socket => {
        if(socket.connecting) {
          socket.setNoDelay(true);
          socket.setTimeout(draft.timeout);
          socket.on('timeout', function() {
            req.abort();
          });
        }
      });

      req.end(draft.payload);
    });
  }

  // props: {path, method, data, timeout}
  async request(props) {
    return this.requestDraft(this.createDraft(props));
  }
};

module.exports = FTXRest;
