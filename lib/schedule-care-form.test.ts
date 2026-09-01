import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildScheduleCareFormDefaults,
  findInitialTreatmentIndex,
} from "./schedule-care-form";
import type { PlantTreatment } from "./treatments";

const defaultDate = "2026-09-06";

const fertilizerTreatment: PlantTreatment = {
  type: "fertilizante",
  products: ["Guano"],
};

const pestTreatments: PlantTreatment[] = [
  {
    type: "anti-bichos",
    products: ["Aceite de neem"],
  },
  {
    type: "anti-hongos",
    products: ["Cobre"],
  },
];

describe("findInitialTreatmentIndex", () => {
  it("matches by treatment type and product note", () => {
    const index = findInitialTreatmentIndex(
      pestTreatments,
      "anti-hongos",
      "Cobre",
    );
    assert.equal(index, 1);
  });

  it("falls back to the first treatment", () => {
    assert.equal(findInitialTreatmentIndex(pestTreatments, "inexistente"), 0);
    assert.equal(findInitialTreatmentIndex([], "anti-bichos"), 0);
  });
});

describe("buildScheduleCareFormDefaults", () => {
  it("builds water defaults from the next watering date", () => {
    const defaults = buildScheduleCareFormDefaults("water", {
      defaultDate,
      nextWateredAt: "2026-09-10",
      fertilizerTreatment: null,
      pruneTreatment: null,
      pestTreatments: [],
    });

    assert.equal(defaults.nextDate, "2026-09-10");
    assert.equal(defaults.notes, "");
    assert.equal(defaults.productName, "");
    assert.equal(defaults.creatingNew, false);
  });

  it("prefills fertilizer product from notes or treatment", () => {
    const fromNotes = buildScheduleCareFormDefaults("fertilizer", {
      defaultDate,
      fertilizerNotes: "  Compost líquido ",
      fertilizerTreatment,
      pruneTreatment: null,
      pestTreatments: [],
    });
    assert.equal(fromNotes.productName, "Compost líquido");

    const fromTreatment = buildScheduleCareFormDefaults("fertilizer", {
      defaultDate,
      fertilizerTreatment,
      pruneTreatment: null,
      pestTreatments: [],
    });
    assert.equal(fromTreatment.productName, "Guano");
  });

  it("opens treatment creation when there are no pest treatments", () => {
    const defaults = buildScheduleCareFormDefaults("treatment", {
      defaultDate,
      fertilizerTreatment: null,
      pruneTreatment: null,
      pestTreatments: [],
    });

    assert.equal(defaults.creatingNew, true);
    assert.equal(defaults.productName, "");
  });

  it("selects an existing pest treatment by type and notes", () => {
    const defaults = buildScheduleCareFormDefaults("treatment", {
      defaultDate,
      fertilizerTreatment: null,
      pruneTreatment: null,
      pestTreatments,
      treatmentType: "anti-hongos",
      pestNotes: "Cobre",
    });

    assert.equal(defaults.selectedIndex, 1);
    assert.equal(defaults.productName, "Cobre");
    assert.equal(defaults.creatingNew, false);
  });
});
