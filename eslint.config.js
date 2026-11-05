const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "dist/", "js/logo-data.js"] },
  js.configs.recommended,
  {
    // Renderer scripts are plain <script> tags that share globals across files
    // (utils.js -> model.js -> render.js -> app.js), so cross-file names are
    // not resolvable per file.
    files: ["js/**/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser } },
    rules: { "no-undef": "off", "no-unused-vars": "off" }
  },
  {
    files: ["main.js", "eslint.config.js", "tests/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } }
  }
];
