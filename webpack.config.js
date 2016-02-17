const path = require('path');

const webpack = require('webpack');
const autoPrefixer = require('autoprefixer');
const combineLoaders = require('webpack-combine-loaders');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const PRODUCTION = process.env.NODE_ENV === 'production';
const EXTRACT = process.env.NODE_ENV === 'extract';

const PATHS = {
    dist: path.resolve(__dirname, 'dist'),
    modules: path.resolve(__dirname, 'modules')
};

// Browsers to target when prefixing CSS.
const COMPATIBILITY = ['Chrome >= 30', 'Safari >= 6.1', 'Firefox >= 35', 'Opera >= 32', 'iOS >= 8', 'Android >= 2.3', 'ie >= 10'];

// React externals
const REACT_EXTERNAL = {
    root: 'React',
    commonjs: 'react',
    commonjs2: 'react',
    amd: 'react'
};

// Externals
const externals = {
    'react': REACT_EXTERNAL,
    'react/addons': REACT_EXTERNAL
};

// Plugins
const plugins = [
    new webpack.DefinePlugin({
        'process.env': { NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development') }
    }),
    new webpack.NoErrorsPlugin(),
];

const devPlugins = [
    new webpack.HotModuleReplacementPlugin()
];

const extractPlugins = [
    new ExtractTextPlugin(PRODUCTION ? 'styles.min.css' : 'styles.css', {
        allChunks: true
    }),
];

const prodPlugins = [
    ...extractPlugins,
    new webpack.optimize.UglifyJsPlugin({
        compress: {
            warnings: false
        },
        output: {
            comments: false
        }
    }),
    new webpack.LoaderOptionsPlugin({
        debug: false,
        minimize: true
    })
];

if (PRODUCTION) {
    plugins.push(...prodPlugins);
} else {
    plugins.push(...devPlugins);
}

if (EXTRACT) {
    plugins.push(...extractPlugins);
}

// Modules
// CSS loader
const CSS_LOADER = combineLoaders([
    {
        loader: 'css',
        query: {
            modules: true,
            importLoaders: 1,
            localIdentName: '[path]___[name]__[local]___[hash:base64:5]',
            sourceMap: true
        }
    },
    {
        loader: 'postcss'
    },
    {
        loader: 'sass',
        query: {
            precision: '8', // See https://github.com/twbs/bootstrap-sass#sass-number-precision
            output: 'expanded',
            sourceMap: true
        }
    }
]);


const config = {
    entry: [
        PRODUCTION || EXTRACT ? 'bootstrap-loader/extractStyles' : 'bootstrap-loader',
        PATHS.modules
    ],

    output: {
        filename: PRODUCTION ? 'bundle.min.js' : 'bundle.js',
        library: 'ascribe-react-components',
        libraryTarget: 'umd',
        path: PATHS.dist
    },

    externals: PRODUCTION ? externals : null,

    debug: !PRODUCTION,

    devtool: PRODUCTION ? '#source-map' : '#inline-source-map',

    resolve: {
        extensions: ['', '.js'],
        modules: ['node_modules'] // Don't use absolute path here to allow recursive matching
    },

    plugins: plugins,

    module: {
        loaders: [
            {
                test: /\.js$/,
                include: [PATHS.modules],
                loader: 'babel',
                query: {
                    cacheDirectory: true,
                    presets: ['react', 'es2015-no-commonjs']
                }
            },
            {
                test: /\.s[ac]ss$/,
                include: [PATHS.modules],
                loader: PRODUCTION || EXTRACT ? ExtractTextPlugin.extract('style', CSS_LOADER)
                                              : `style!${CSS_LOADER}`
            }
        ]
    },

    postcss: [ autoPrefixer({ browsers: COMPATIBILITY }) ]
};

module.exports = config;