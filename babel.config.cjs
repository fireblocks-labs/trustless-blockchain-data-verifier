module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs', '@babel/plugin-proposal-export-default-from'],
};
