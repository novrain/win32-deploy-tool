/**
 * Created by liuxinyi on 2015/8/6.
 */
module.exports = {
    entry: './static/javascripts/src/main.js',
    output: {
        filename: './static/javascripts/build/index.js'
    },
    module: {
        loaders: [
            { test: /\.js$/, loader: "jsx-loader" },
            { test: /\.css$/, loader: "style-loader!css-loader" }
        ]
    }
};