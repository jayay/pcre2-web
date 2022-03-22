const PCRE2_ERROR_NOMATCH = -1;
class PCRE2 {
    constructor(regexp) {
        this.regexp = regexp;

        fetch('out.wasm')
            .then(request => request.arrayBuffer())
            .then((binary) => {
                let imports = {};
                imports['memory'] = new WebAssembly['Memory']({'initial': 100});
                this.memory = new Uint8Array(imports['memory']['buffer']);
                return WebAssembly['instantiate'](binary, {"env": imports})
            })
            .then(program => {
                this.instance = program['instance'];
                const exports = this.instance['exports'];
                this.err_buf = exports.malloc(256);
                const err = exports.malloc(2);
                const err_offset = exports.malloc(4);

                const te = new TextEncoder();
                const td = new TextDecoder();
                const text_encoded = te.encode(regexp);
                const re_ptr = exports.malloc(text_encoded.length);
                this.memory.set(text_encoded, re_ptr);
                if (!this.err_buf || !err || !err_offset) {
                    throw new Error("Out of memory");
                }

                this.re_comp_ptr = exports.pcre2_compile(re_ptr, text_encoded.length, 0, err, err_offset, 0);
                if (this.re_comp_ptr === 0) {
                    const err_len = exports.pcre2_get_error_message(err, this.err_buf, 256);
                    const error = td.decode(this.memory.slice(this.err_buf, this.err_buf + err_len))
                    throw new Error("Failed to compile regex at offset " + this.memory[err_offset] + ": " + error);
                }
            });
    }

    test(subject, flags) {
        const exports = this.instance['exports'];
        const td = new TextDecoder();
        const te = new TextEncoder();

        const subj_buf = te.encode(subject)
        const subj_ptr = exports.malloc(subj_buf.length)

        this.memory.set(subj_buf, subj_ptr);

        const match_data = exports.pcre2_match_data_create_from_pattern(this.re_comp_ptr, 0);

        if (match_data === 0) {
            throw new Error("match_data is null");
        }

        const rc = exports.pcre2_match(
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
            const err_len = exports.pcre2_get_error_message(rc, this.err_buf, 256);
            throw new Error(td.decode(this.memory.slice(this.err_buf, this.err_buf + err_len)));
        }

        return true
    }
}