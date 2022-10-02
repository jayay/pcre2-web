# pcre2-web

[![Node.js CI](https://github.com/jayay/pcre2-web/actions/workflows/node.js.yml/badge.svg)](https://github.com/jayay/pcre2-web/actions/workflows/node.js.yml)

This library brings the [PCRE2](https://pcre.org) C library to the web using [WebAssembly](https://en.wikipedia.org/wiki/WebAssembly) (Wasm). This package 
contains the Wasm binary of libpcre2, as well as a JavaScript/TypeScript wrapper around it. The API of the wrapper code is not stable yet and is likely to change.

## Getting Started
The NPM package contains the entire Wasm binary. Since this scoped NPM is hosted on Github Packages, you'll need to associate the `@jayay` scope with the Github package registry:

```
npm config set @jayay:registry https://npm.pkg.github.com
```

You can now add the depencency to your project:

```
npm install @jayay/pcre2-web
```

## License

This project is licensed under the 3-clause BSD license. The license can be found in the [LICENSE.txt](LICENSE.txt) file.
