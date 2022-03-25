const PCRE2_ERROR_NOMATCH = -1;
export default class PCRE2 {
    public regexp: string;
    private readonly instance: WebAssembly.Instance;
    private memory: Uint8Array;
    private readonly err_buf: number; // ptr
    private readonly re_comp_ptr: number; // ptr

    private constructor(regexp: string, instance: WebAssembly.Instance, memory: Uint8Array, err_buf: number, re_comp_ptr: number) {
        this.regexp = regexp;
        this.instance = instance;
        this.memory = memory;
        this.err_buf = err_buf;
        this.re_comp_ptr = re_comp_ptr;
    }
    static create(regexp: string): Promise<PCRE2> {
        const imp_wasm = {
        // @ts-ignore
            memory: new WebAssembly.Memory({'initial': 100}),
        };
        // @ts-ignore
        const memory = new Uint8Array(imp_wasm.memory.buffer);

        let file = './out.wasm';

        let environment: string;
        try {
            window;
            environment = 'browser';
        } catch (e) {
            environment = 'node'
        }

        let wasmBuffer = null;
        if (environment === 'node') {
            const fs = require('fs');
            const path = require('path');
            wasmBuffer = fs.readFileSync(path.resolve(__dirname, file));
        } else {
            // todo: resolve promise
            wasmBuffer = fetch(file).then(response => response.arrayBuffer());
        }

        return WebAssembly.instantiate(wasmBuffer, { env: imp_wasm })
            .then(program => {
                const instance = program['instance'];
                const exports = instance['exports'];
                // @ts-ignore
                const err_buf = exports.malloc(512);
                // @ts-ignore
                const err = exports.malloc(2);
                // @ts-ignore
                const err_offset = exports.malloc(4);

                const te = new TextEncoder();
                const td = new TextDecoder();
                const text_encoded = te.encode(regexp);
                // @ts-ignore
                const re_ptr = exports.malloc(text_encoded.length);
                memory.set(text_encoded, re_ptr);
                if (!err_buf || !err || !err_offset) {
                    return Promise.reject(new Error("Out of memory"));
                }

                // @ts-ignore
                const re_comp_ptr = exports.pcre2_compile_8(re_ptr, text_encoded.length, 0, err, err_offset, 0);
                if (re_comp_ptr === 0) {
                    // @ts-ignore
                    // todo: memory[err] might be too short
                    const err_len = exports.pcre2_get_error_message_8(memory[err], err_buf, 512);
                    const error = td.decode(memory.slice(err_buf, err_buf + err_len))
                    return Promise.reject(new Error("Failed to compile regex at offset " + memory[err_offset] + ": " + error));
                }
                return new PCRE2(regexp, instance, memory, err_buf, re_comp_ptr);
            });
    }

    test(subject: string, flags = 0) {
        const exports = this.instance['exports'];
        const td = new TextDecoder();
        const te = new TextEncoder();

        const subj_buf = te.encode(subject)
        // @ts-ignore
        const subj_ptr = exports.malloc(subj_buf.length)

        this.memory.set(subj_buf, subj_ptr);

        // @ts-ignore
        const match_data = exports.pcre2_match_data_create_from_pattern_8(this.re_comp_ptr, 0);

        if (match_data === 0) {
            throw new Error("match_data is null");
        }

        // @ts-ignore
        const rc = exports.pcre2_match_8(
            this.re_comp_ptr,                /* the compiled pattern */
            subj_ptr,                       /* the subject string */
            subj_buf.length,                /* the length of the subject */
            0,                              /* start at offset 0 in the subject */
            flags || 0,                     /* default options */
            match_data,                     /* block for storing the result */
            0);                             /* use default match context */

        // @ts-ignore
        exports.free(subj_ptr);

        if (rc === PCRE2_ERROR_NOMATCH) {
            return false
        } else if (rc < 0) {
            // @ts-ignore
            const err_len = exports.pcre2_get_error_message_8(rc, this.err_buf, 256);
            throw new Error(td.decode(this.memory.slice(this.err_buf, this.err_buf + err_len)));
        }

        return true
    }
}