/* eslint @typescript-eslint/ban-ts-comment: "warn" */
// @ts-ignore
import * as wasm from './out.wasm';

const PCRE2_ERROR_NOMATCH = -1;

export const PCRE2_ALLOW_EMPTY_CLASS =   0x00000001;  /* C       */
export const PCRE2_ALT_BSUX =            0x00000002;  /* C       */
export const PCRE2_AUTO_CALLOUT =        0x00000004;  /* C       */
export const PCRE2_CASELESS =            0x00000008;  /* C       */
export const PCRE2_DOLLAR_ENDONLY =      0x00000010;  /*   J M D */
export const PCRE2_DOTALL =              0x00000020;  /* C       */
export const PCRE2_DUPNAMES =            0x00000040;  /* C       */
export const PCRE2_EXTENDED =            0x00000080;  /* C       */
export const PCRE2_FIRSTLINE =           0x00000100;  /*   J M D */
export const PCRE2_MATCH_UNSET_BACKREF = 0x00000200;  /* C J M   */
export const PCRE2_MULTILINE =           0x00000400;  /* C       */
export const PCRE2_NEVER_UCP =           0x00000800;  /* C       */
export const PCRE2_NEVER_UTF =           0x00001000;  /* C       */
export const PCRE2_NO_AUTO_CAPTURE =     0x00002000;  /* C       */
export const PCRE2_NO_AUTO_POSSESS =     0x00004000;  /* C       */
export const PCRE2_NO_DOTSTAR_ANCHOR =   0x00008000;  /* C       */
export const PCRE2_NO_START_OPTIMIZE =   0x00010000;  /*   J M D */
export const PCRE2_UCP =                 0x00020000;  /* C J M D */
export const PCRE2_UNGREEDY =            0x00040000;  /* C       */
export const PCRE2_UTF =                 0x00080000;  /* C J M D */
export const PCRE2_NEVER_BACKSLASH_C =   0x00100000;  /* C       */
export const PCRE2_ALT_CIRCUMFLEX =      0x00200000;  /*   J M D */
export const PCRE2_ALT_VERBNAMES =       0x00400000;  /* C       */
export const PCRE2_USE_OFFSET_LIMIT =    0x00800000;  /*   J M D */
export const PCRE2_EXTENDED_MORE =       0x01000000;  /* C       */
export const PCRE2_LITERAL =             0x02000000;  /* C       */

export class PCRE2 {
    public readonly regexp: string;
    private readonly err_buf: number; // ptr
    private readonly re_comp_ptr: number; // ptr

    private constructor(regexp: string, err_buf: number, re_comp_ptr: number) {
        this.regexp = regexp;
        this.err_buf = err_buf;
        this.re_comp_ptr = re_comp_ptr;
    }
    static create(regexp: string, flags: number = 0): PCRE2 {
        const memory = new Uint8Array(wasm.memory.buffer);
        const err_buf_ptr = wasm.malloc(256);
        const err_ptr = wasm.malloc(2);
        const err_offset_ptr = wasm.malloc(4);

        const te = new TextEncoder();
        const td = new TextDecoder();
        const text_encoded = te.encode(regexp);
        const re_ptr = wasm.malloc(text_encoded.length);

        if (err_buf_ptr === 0 || err_ptr === 0 || err_offset_ptr === 0 || re_ptr === 0) {
            throw new Error("Out of memory");
        }

        memory.set(text_encoded, re_ptr);

        const re_comp_ptr = wasm.pcre2_compile_8(re_ptr, text_encoded.length, flags, err_ptr, err_offset_ptr, 0);
        if (re_comp_ptr === 0) {
            const error_int = Buffer.from(memory.slice(err_ptr, err_ptr + 2)).readUInt16LE(0);
            const error_offset_int = Buffer.from(memory.slice(err_offset_ptr, err_offset_ptr + 4)).readInt32LE(0);
            const err_len = wasm.pcre2_get_error_message_8(error_int, err_buf_ptr, 256);
            const error = td.decode(memory.slice(err_buf_ptr, err_buf_ptr + err_len))
            const message = "Failed to compile regex at offset " + error_offset_int + ": " + error;
            wasm.free(err_buf_ptr);
            wasm.free(err_ptr);
            wasm.free(err_offset_ptr);
            wasm.free(re_ptr);
            throw new Error(message);
        }
        return new PCRE2(regexp, err_buf_ptr, re_comp_ptr);
    }

    test(subject: string, flags = 0) {
        const td = new TextDecoder();
        const te = new TextEncoder();

        const memory = new Uint8Array(wasm.memory.buffer);
        
        const subj_buf = te.encode(subject)
        const subj_ptr = wasm.malloc(subj_buf.length)

        memory.set(subj_buf, subj_ptr);

        const match_data = wasm.pcre2_match_data_create_from_pattern_8(this.re_comp_ptr, 0);

        if (match_data === 0) {
            throw new Error("match_data is null");
        }

        const rc = wasm.pcre2_match_8(
            this.re_comp_ptr,                /* the compiled pattern */
            subj_ptr,                       /* the subject string */
            subj_buf.length,                /* the length of the subject */
            0,                              /* start at offset 0 in the subject */
            flags,                          /* default options */
            match_data,                     /* block for storing the result */
            0);                             /* use default match context */

        wasm.free(subj_ptr);

        if (rc === PCRE2_ERROR_NOMATCH) {
            return false
        } else if (rc < 0) {
            const err_len = wasm.pcre2_get_error_message_8(rc, this.err_buf, 256);
            wasm.pcre2_match_data_free_8(match_data);
            throw new Error(td.decode(memory.slice(this.err_buf, this.err_buf + err_len)));
        }
        wasm.pcre2_match_data_free_8(match_data);
        return true
    }
}