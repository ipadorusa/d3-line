const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const appName = "d3-line";

module.exports = (env, options) => {
    const config = {
        entry: {
            build: ['@babel/polyfill', `./${appName}/app.js`]
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, `./${appName}/sample/test/`),
            libraryTarget: 'var',
            library: 'UI'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    include: path.join(__dirname),
                    exclude: /(node_modules\/(?!(@saramin)\/).*)|(dist)/,
                    use: {
                        loader : 'babel-loader',
                        options : {
                            presets : ['@babel/preset-env']
                        }
                    }
                }
            ]
        },
        plugins: [
            new CleanWebpackPlugin(),
            new webpack.SourceMapDevToolPlugin({
                filename : '[name].js.map'
            })
        ]
    }

    if(options.mode === 'development') {
        config.devServer = {
            contentBase: path.join(__dirname, `/${appName}/sample/`),
            port: 8181
        };
    } else {
        config.optimization = {
            minimizer: [
                new TerserPlugin()
            ],
        };
    }

    return config;
};
