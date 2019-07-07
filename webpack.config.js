const path = require('path')
  ,webpack = require('webpack')
  , {CleanWebpackPlugin} = require('clean-webpack-plugin')
  ,HtmlWebpackPlugin = require('html-webpack-plugin')
  ,CopyWebpackPlugin = require('copy-webpack-plugin')
  ,UglifyJsPlugin = require('uglifyjs-webpack-plugin')
  ,ExtractTextPlugin = require('extract-text-webpack-plugin')

var childProcess = require('child_process')
var gitCommitCount = parseInt(childProcess.execSync('git rev-list HEAD --count')).toString()

module.exports = {
  entry: {
    app: './src/js/app.js',
    map: './src/js/map.js'
  },
  output: {
    filename: '[name].[chunkhash].js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new ExtractTextPlugin('style.css'),
    new webpack.DefinePlugin({
      'process.env.BUILD': JSON.stringify(gitCommitCount)
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery'
    }),
    new CleanWebpackPlugin({cleanOnceBeforeBuildPatterns: ['dist']}),
    new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        chunks: ['app']
    }),
    new HtmlWebpackPlugin({
        template: './src/map.html',
        filename: 'map.html',
        chunks: ['map']
    }),
    new CopyWebpackPlugin([
        { from: './src/assets', to: 'assets' },
        { from: './src/styles', to: 'styles' },
        { from: './server/*.json', to: '.' },
        { from: './server/*.geojson', to: '.' },
    ]),
    new UglifyJsPlugin({
      sourceMap: true
    })
  ],
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.(s*)css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                minimize: true,
                sourceMap: true
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true
              }
            }
          ]
        })
      },
      {
        test: /\.(png|jpg|gif)$/,
        use: ['url-loader']
      }
    ]
  }
}