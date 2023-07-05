import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'

// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js!
/**
 * @type {import('dts-cli').DtsConfig}
 */
module.exports = {
    // This function will run for each entry/format/env combination
    rollup(config, options) {
        config.plugins.push(
            external(),
            postcss({
              modules: true,
              minimize: true,
              plugins: [autoprefixer()],
            }),
        );
      return config; // always return a config.
    },
  };