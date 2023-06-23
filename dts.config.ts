import external from 'rollup-plugin-peer-deps-external';
import css from "rollup-plugin-import-css";

// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js!
/**
 * @type {import('dts-cli').DtsConfig}
 */
module.exports = {
    // This function will run for each entry/format/env combination
    rollup(config, options) {
        config.plugins.push(
            external(),
            css()
        );
      return config; // always return a config.
    },
  };