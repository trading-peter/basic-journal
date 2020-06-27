const Logger = new class {
  async register(server, options) {
    server.events.on('log', event => this._toConsole(event));
    server.events.on('request', (request, event) => this._toConsole(event));
  }

  _toConsole(event) {
    console.log(new Date().toISOString(), event.tags, event.error ? event.error : event.data);
  }
}

module.exports = {
  name: 'logger',
  version: '1.0.0',
  register: Logger.register.bind(Logger)
};
