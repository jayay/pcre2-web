import PCRE2 from "./pcre2";

const assert = require("assert");

describe("pcre2 bindings", () => {
  it("Is able to access regexp property", () => {
    return PCRE2.create("[Hh]ell[oO]").then((pcre2) => {
      assert.deepStrictEqual(pcre2.regexp, "[Hh]ell[oO]");
    });
  });

  it("Is able to match basic regex", () => {
    return PCRE2.create("[Hh]ell[oO]").then((pcre2) => {
      assert(pcre2.test("Hello"));
      assert(!pcre2.test("Hola"));
    });
  });

  it("Communicates errors back to the caller", () => {
    return PCRE2.create("[Hh]elloO\\")
      .then(() => assert.fail("Should not have succeeded"))
      .catch((err) => {
        assert.deepStrictEqual(err.toString(), "Error: Failed to compile regex at offset 10: \\ at end of pattern");
      });
  });

  it("Is able to test basic regex against input", () => {
    return PCRE2.create("[Hh]ell[oO]").then((pcre2) => {
      assert(pcre2.test("Hello"));
      assert(!pcre2.test("Hola"));
    });
  });

  it("Is able to test basic regex against input in Unicode without 'u' modifier", () => {
    return PCRE2.create("[Hh]allö").then((pcre2) => {
      assert(pcre2.test("Hallöchen"));
      assert(!pcre2.test("Hallo"));
    });
  });
});