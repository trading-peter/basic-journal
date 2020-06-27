const gulp = require('gulp');
const rollup = require('rollup');
const json = require('rollup-plugin-json');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const livereload = require('livereload');
const minify = require('rollup-plugin-minify-es');
const uglify = require('uglify-es').minify;
const cond = require('rollup-plugin-conditional');

let cacheClient;

const pluginConfig = (options = {}) => {
  return [
    json(),
    resolve(),
    commonjs(),
    cond(options.minify, [
      minify({
        mangle: { toplevel: true }
      }, uglify),
    ])
  ];
}

const buildClient = async (options = {}) => {
  const bundle = await rollup.rollup({
    input: {
      'bj-app': 'client/src/bj-app.js'
    },
    cache: cacheClient,
    plugins: pluginConfig()
  });

  cacheClient = bundle.cache;

  await bundle.write({
    dir: 'client/dist',
    format: 'esm',
    sourcemap: options.minify ? false : 'inline'
  });
};

gulp.task('dev-client', async () => {
  await buildClient();
  gulp.watch([ 'client/src/**' ], buildClient);
  const server = livereload.createServer();
  server.watch('client/dist');
});

gulp.task('build', async () => {
  await buildClient({ minify: true });
});
