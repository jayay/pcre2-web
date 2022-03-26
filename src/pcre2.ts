import {load_wasm_file} from './wasm_loader';

const PCRE2_ERROR_NOMATCH = -1;
export default class PCRE2 {
    public readonly regexp: string;
    private readonly instance: WebAssembly.Instance;
    private readonly memory: Uint8Array;
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
            memory: new WebAssembly.Memory({'initial': 100}),
        };

        const memory = new Uint8Array(imp_wasm.memory.buffer);

       return load_wasm_file( { env: imp_wasm })
           .then(program => {
                // @ts-ignore
                const instance = program.instance;
                const exports = instance.exports;
                const err_buf_ptr = exports.malloc(256);
                const err_ptr = exports.malloc(2);
                const err_offset_ptr = exports.malloc(4);

                const te = new TextEncoder();
                const td = new TextDecoder();
                const text_encoded = te.encode(regexp);
                const re_ptr = exports.malloc(text_encoded.length);

                if (!err_buf_ptr || !err_ptr || !err_offset_ptr || !re_ptr) {
                    return Promise.reject(new Error("Out of memory"));
                }

               memory.set(text_encoded, re_ptr);

                const re_comp_ptr = exports.pcre2_compile_8(re_ptr, text_encoded.length, 0, err_ptr, err_offset_ptr, 0);
                if (re_comp_ptr === 0) {
                    const error_int = Buffer.from(memory.slice(err_ptr, err_ptr + 2)).readUInt16LE(0);
                    const error_offset_int = Buffer.from(memory.slice(err_offset_ptr, err_offset_ptr + 4)).readInt32LE(0);
                    const err_len = exports.pcre2_get_error_message_8(error_int, err_buf_ptr, 256);
                    const error = td.decode(memory.slice(err_buf_ptr, err_buf_ptr + err_len))
                    const message = "Failed to compile regex at offset " + error_offset_int + ": " + error;
                    exports.free(err_buf_ptr);
                    exports.free(err_ptr);
                    exports.free(err_offset_ptr);
                    exports.free(re_ptr);
                    return Promise.reject(new Error(message));
                }
                return new PCRE2(regexp, instance, memory, err_buf_ptr, re_comp_ptr);
            });
    }

    test(subject: string, flags = 0) {
        const exports: any = this.instance.exports;
        const td = new TextDecoder();
        const te = new TextEncoder();

        const subj_buf = te.encode(subject)
        const subj_ptr = exports.malloc(subj_buf.length)

        this.memory.set(subj_buf, subj_ptr);

        const match_data = exports.pcre2_match_data_create_from_pattern_8(this.re_comp_ptr, 0);

        if (match_data === 0) {
            throw new Error("match_data is null");
        }

        const rc = exports.pcre2_match_8(
            this.re_comp_ptr,                /* the compiled pattern */
            subj_ptr,                       /* the subject string */
            subj_buf.length,                /* the length of the subject */
            0,                              /* start at offset 0 in the subject */
            flags || 0,                     /* default options */
            match_data,                     /* block for storing the result */
            0);                             /* use default match context */

        exports.free(subj_ptr);

        if (rc === PCRE2_ERROR_NOMATCH) {
            return false
        } else if (rc < 0) {
            const err_len = exports.pcre2_get_error_message_8(rc, this.err_buf, 256);
            exports.pcre2_match_data_free_8(match_data);
            throw new Error(td.decode(this.memory.slice(this.err_buf, this.err_buf + err_len)));
        }
        exports.pcre2_match_data_free_8(match_data);
        return true
    }
}