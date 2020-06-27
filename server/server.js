const Hapi = require('@hapi/hapi');
const Config = require(`./config/${process.env.CONFIG || 'development'}`);
const Path = require('path');

const init = async () => {
  const server = Hapi.server({
    port: Config.port,
    host: '0.0.0.0'
  });

  await server.register(require('./logger/logger'));
  await server.register({ plugin: require('./db/db'), options: Config.db });
  await server.register({ plugin: require('./journal/journal'), options: Config.journal });
  await server.register(require('@hapi/inert'));

  server.route([
    {
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: Path.resolve(Path.join(__dirname, '../client')),
          index: [ 'index.html' ],
          listing: false
        }
      }
    },
    {
      method: 'GET',
      path: '/appConfig',
      handler: async request => {
        return { config: Config.appConfig };
      }
    }
  ]);

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', async (err) => {
  console.log(err);
  process.exit(1);
});

init();
