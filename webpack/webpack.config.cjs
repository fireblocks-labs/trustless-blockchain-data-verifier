const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const webpack = require('webpack');
module.exports = {
  devtool: 'source-map',
  mode: 'production',
  externals: {
    'node:http': '{}',
    'node:url': '{}',
    'node:path': '{}',
    'node:https': '{}',
    'node:stream/web': '{}',
    '@chainsafe/blst': '{}',
    'http-proxy': '{}',
  },
  entry: {
    content: path.resolve(__dirname, '..', 'src', 'pages', 'content', 'index.ts'),
    background: path.resolve(__dirname, '..', 'src', 'pages', 'background', 'index.ts'),
    popup: path.resolve(__dirname, '..', 'src', 'pages', 'popup', 'index.tsx'),
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.*', '.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      '@chainsafe/blst': false, // @chainsafe/blst is a peer dependency which is not needed in a browser environment
      http: false, //require.resolve("stream-http"),
      https: false, //require.resolve("https-browserify"),
      crypto: false,
      stream: false,
      url: false,
      os: false,
      path: false,
      zlib: false,
      fs: false,
      events: false,
      node: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false, // Allow importing without specifying file extension
        },
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
        // More information here https://webpack.js.org/guides/asset-modules/
        type: 'asset',
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin({ verbose: false }),
    new webpack.ProgressPlugin(),
    new CopyPlugin({
      patterns: [{ from: '.', to: '.', context: 'public', force: true }],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '..', 'src', 'pages', 'popup', 'index.html'),
      filename: 'popup.html',
      chunks: ['popup'],
      cache: false,
    }),
    new webpack.DefinePlugin({
      process: {
        argv: [],
        env: {},
        nextTick: function () {
          return null;
        },
      },
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
};
