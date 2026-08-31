import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authErrorMessage } from "./supabase.ts";

describe("authErrorMessage", () => {
  it("maps duplicate signup", () => {
    assert.match(
      authErrorMessage("User already registered"),
      /compte existe déjà/i,
    );
  });

  it("maps unconfirmed email", () => {
    assert.match(
      authErrorMessage("Email not confirmed"),
      /Confirmez/i,
    );
  });

  it("maps invalid credentials", () => {
    assert.match(
      authErrorMessage("Invalid login credentials"),
      /incorrect/i,
    );
  });
});
