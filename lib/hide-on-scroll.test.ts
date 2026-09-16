import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldHideHeaderOnScroll } from "./hide-on-scroll";

describe("shouldHideHeaderOnScroll", () => {
  it("queda visible cerca del tope", () => {
    assert.equal(
      shouldHideHeaderOnScroll({ y: 0, lastY: 40, hidden: true }),
      false,
    );
    assert.equal(
      shouldHideHeaderOnScroll({ y: 6, lastY: 0, hidden: false }),
      false,
    );
  });

  it("se oculta al scrollear hacia abajo", () => {
    assert.equal(
      shouldHideHeaderOnScroll({ y: 80, lastY: 40, hidden: false }),
      true,
    );
  });

  it("reaparece al scrollear hacia arriba", () => {
    assert.equal(
      shouldHideHeaderOnScroll({ y: 40, lastY: 80, hidden: true }),
      false,
    );
  });

  it("ignora micro movimientos", () => {
    assert.equal(
      shouldHideHeaderOnScroll({ y: 84, lastY: 80, hidden: false }),
      false,
    );
    assert.equal(
      shouldHideHeaderOnScroll({ y: 76, lastY: 80, hidden: true }),
      true,
    );
  });
});
