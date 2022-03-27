// @ts-ignore
import path from 'path';


module.exports = {
    entry: './pkg/loader.js',
    mode: 'production',
    target: 'es6',
    output: {
        filename: './main.js',
        path: path.resolve(__dirname, '../dist'),
        chunkFormat: 'commonjs',
    },
    experiments: {
        asyncWebAssembly: true,
        layers: true,
        outputModule: true,
        topLevelAwait: true,
    },
    resolve: {
        alias: {
            // possibly a bug in webpack
            env: false
        },
    },
};