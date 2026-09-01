import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getClientMountedSnapshot,
  getServerMountedSnapshot,
  shouldRenderClientPortal,
  subscribeClientMounted,
} from "./client-mounted";

describe("client-mounted helpers", () => {
  it("reports mounted on the client snapshot", () => {
    assert.equal(getClientMountedSnapshot(), true);
    assert.equal(getServerMountedSnapshot(), false);
  });

  it("returns an unsubscribe noop from subscribe", () => {
    const unsubscribe = subscribeClientMounted();
    assert.equal(typeof unsubscribe, "function");
    assert.doesNotThrow(() => unsubscribe());
  });

  it("only renders the portal when open and mounted", () => {
    assert.equal(shouldRenderClientPortal(false, false), false);
    assert.equal(shouldRenderClientPortal(true, false), false);
    assert.equal(shouldRenderClientPortal(false, true), false);
    assert.equal(shouldRenderClientPortal(true, true), true);
  });
});
