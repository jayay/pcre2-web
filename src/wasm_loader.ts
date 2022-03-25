type WasmLoadFn = 'fs' | 'fetch';

const get_wasm_env = (): WasmLoadFn => {
    try {
        fetch;
        return 'fetch';
    } catch (e) {
        return 'fs';
    }
}

export function load_wasm_file(importObject: any): Promise<WebAssembly.Module> {
    const env = get_wasm_env();
    if (env === 'fs') {
        const path = require('path');
        const fs = require('fs');

        return WebAssembly.instantiate(fs.readFileSync(path.resolve(__dirname, 'out.wasm')), importObject);
    } else {
        return fetch('out.wasm').then(response => response.arrayBuffer()).then(bytes => WebAssembly.instantiate(bytes), importObject);
    }
}