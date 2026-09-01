import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activateMapPlant,
  MAP_PLANT_DOUBLE_TAP_MS,
} from "./map-plant-activate";

const plant = { id: "plant-1" };

function createOptions(overrides: Partial<Parameters<typeof activateMapPlant>[1]> = {}) {
  const pushed: string[] = [];
  const named: string[] = [];

  const options = {
    editMode: false,
    movedRef: { current: false },
    isDesktopPointer: () => false,
    push: (href: string) => pushed.push(href),
    namedId: null as string | null,
    lastTapRef: { current: null as { id: string; at: number } | null },
    setNamedId: (id: string | null) => {
      options.namedId = id;
      named.push(id ?? "");
    },
    now: () => 1_000,
    ...overrides,
  };

  return { options, pushed, named };
}

describe("activateMapPlant", () => {
  it("navigates immediately on desktop pointer", () => {
    const { options, pushed, named } = createOptions({
      isDesktopPointer: () => true,
    });

    activateMapPlant(plant, options);

    assert.deepEqual(pushed, ["/plants/plant-1"]);
    assert.deepEqual(named, []);
  });

  it("does nothing in edit mode or after a drag", () => {
    const edit = createOptions({ editMode: true });
    activateMapPlant(plant, edit.options);
    assert.deepEqual(edit.pushed, []);

    const moved = createOptions({ movedRef: { current: true } });
    activateMapPlant(plant, moved.options);
    assert.deepEqual(moved.pushed, []);
  });

  it("shows the plant name on the first mobile tap", () => {
    const { options, pushed, named } = createOptions();

    activateMapPlant(plant, options);

    assert.deepEqual(pushed, []);
    assert.equal(options.namedId, "plant-1");
    assert.deepEqual(named, ["plant-1"]);
    assert.deepEqual(options.lastTapRef.current, { id: "plant-1", at: 1_000 });
  });

  it("navigates on the second mobile tap inside the window", () => {
    const { options, pushed } = createOptions({
      namedId: "plant-1",
      lastTapRef: {
        current: { id: "plant-1", at: 1_000 - MAP_PLANT_DOUBLE_TAP_MS + 50 },
      },
      now: () => 1_000,
    });

    activateMapPlant(plant, options);

    assert.deepEqual(pushed, ["/plants/plant-1"]);
    assert.equal(options.namedId, null);
    assert.equal(options.lastTapRef.current, null);
  });

  it("treats a slow second tap as a new first tap", () => {
    const { options, pushed } = createOptions({
      namedId: "plant-1",
      lastTapRef: {
        current: { id: "plant-1", at: 1_000 - MAP_PLANT_DOUBLE_TAP_MS - 1 },
      },
      now: () => 1_000,
    });

    activateMapPlant(plant, options);

    assert.deepEqual(pushed, []);
    assert.equal(options.namedId, "plant-1");
    assert.deepEqual(options.lastTapRef.current, { id: "plant-1", at: 1_000 });
  });
});
