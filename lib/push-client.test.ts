import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FCM_ACTIVATED_FLAG,
  detectPushSupportFromWindow,
  readFcmActivatedFromLocation,
} from "./push-client";

describe("readFcmActivatedFromLocation", () => {
  it("activates from ?avisos=ok and cleans the URL", () => {
    const storage = new Map<string, string>();
    const history: string[] = [];
    const location = {
      search: "?avisos=ok&foo=bar",
      pathname: "/plantas",
      hash: "#menu",
    };

    const activated = readFcmActivatedFromLocation(
      {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      location,
      {
        replaceState: (_state, _title, url) => {
          history.push(String(url));
        },
      },
    );

    assert.equal(activated, true);
    assert.equal(storage.get(FCM_ACTIVATED_FLAG), "1");
    assert.deepEqual(history, ["/plantas?foo=bar#menu"]);
  });

  it("reads the persisted flag from storage", () => {
    const storage = new Map<string, string>([[FCM_ACTIVATED_FLAG, "1"]]);

    const activated = readFcmActivatedFromLocation(
      {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
      { search: "", pathname: "/plantas", hash: "" },
      { replaceState: () => {} },
    );

    assert.equal(activated, true);
  });
});

describe("detectPushSupportFromWindow", () => {
  it("returns checking when window is missing", () => {
    assert.equal(detectPushSupportFromWindow(undefined), "checking");
  });

  it("detects insecure contexts", () => {
    assert.equal(
      detectPushSupportFromWindow({
        isSecureContext: false,
        navigator: {},
      } as Window),
      "insecure",
    );
  });

  it("detects missing browser APIs", () => {
    assert.equal(
      detectPushSupportFromWindow({
        isSecureContext: true,
        navigator: {},
      } as Window),
      "unsupported",
    );
  });

  it("accepts a browser with push prerequisites", () => {
    assert.equal(
      detectPushSupportFromWindow({
        isSecureContext: true,
        navigator: { serviceWorker: {} },
        PushManager: class {},
        Notification: class {},
      } as unknown as Window),
      "ok",
    );
  });
});
