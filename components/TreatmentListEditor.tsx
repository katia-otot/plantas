"use client";

import {
  TREATMENT_TYPE_LABELS,
  availableTreatmentTypes,
  emptyTreatment,
  getTreatmentLabel,
  isDescriptionTreatmentType,
  type PlantTreatment,
  type TreatmentType,
} from "@/lib/treatments";

interface TreatmentListEditorProps {
  treatments: PlantTreatment[];
  onChange: (treatments: PlantTreatment[]) => void;
}

export function TreatmentListEditor({
  treatments,
  onChange,
}: TreatmentListEditorProps) {
  function updateTreatment(
    index: number,
    patch: Partial<PlantTreatment>,
  ) {
    onChange(
      treatments.map((treatment, currentIndex) =>
        currentIndex === index ? { ...treatment, ...patch } : treatment,
      ),
    );
  }

  function updateProduct(
    treatmentIndex: number,
    productIndex: number,
    value: string,
  ) {
    onChange(
      treatments.map((treatment, currentIndex) => {
        if (currentIndex !== treatmentIndex) {
          return treatment;
        }

        const products = treatment.products.map((product, currentProductIndex) =>
          currentProductIndex === productIndex ? value : product,
        );

        return { ...treatment, products };
      }),
    );
  }

  function setDescription(treatmentIndex: number, value: string) {
    onChange(
      treatments.map((treatment, currentIndex) =>
        currentIndex === treatmentIndex
          ? { ...treatment, products: [value] }
          : treatment,
      ),
    );
  }

  function addProduct(treatmentIndex: number) {
    onChange(
      treatments.map((treatment, currentIndex) =>
        currentIndex === treatmentIndex
          ? { ...treatment, products: [...treatment.products, ""] }
          : treatment,
      ),
    );
  }

  function removeProduct(treatmentIndex: number, productIndex: number) {
    onChange(
      treatments
        .map((treatment, currentIndex) => {
          if (currentIndex !== treatmentIndex) {
            return treatment;
          }

          const products = treatment.products.filter(
            (_, currentProductIndex) => currentProductIndex !== productIndex,
          );

          return { ...treatment, products };
        })
        .filter((treatment) => treatment.products.length > 0),
    );
  }

  function removeTreatment(index: number) {
    onChange(treatments.filter((_, currentIndex) => currentIndex !== index));
  }

  function addTreatment(type: TreatmentType) {
    onChange([...treatments, emptyTreatment(type)]);
  }

  const addableTypes = availableTreatmentTypes(treatments);

  return (
    <div className="space-y-3">
      {treatments.length === 0 && (
        <p className="text-sm text-emerald-900/60">
          Todavía no hay tratamientos cargados.
        </p>
      )}

      {treatments.map((treatment, treatmentIndex) => (
        <div
          key={`${treatment.type}-${treatmentIndex}`}
          className="space-y-3 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                {getTreatmentLabel(treatment)}
              </p>
              <p className="text-xs text-emerald-900/60">
                {TREATMENT_TYPE_LABELS[treatment.type]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeTreatment(treatmentIndex)}
              className="shrink-0 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Quitar
            </button>
          </div>

          {treatment.type === "otro" && (
            <input
              value={treatment.label ?? ""}
              onChange={(event) =>
                updateTreatment(treatmentIndex, { label: event.target.value })
              }
              className="w-full rounded-xl border border-emerald-900/15 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
              placeholder="Nombre del tratamiento"
            />
          )}

          {isDescriptionTreatmentType(treatment.type) ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-emerald-900/70">
                Descripción
              </span>
              <textarea
                value={treatment.products[0] ?? ""}
                onChange={(event) =>
                  setDescription(treatmentIndex, event.target.value)
                }
                rows={3}
                className="w-full rounded-xl border border-emerald-900/15 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
                placeholder="Ej. sacar ramas secas, formar copa, bajar altura..."
              />
            </label>
          ) : (
            <>
              <div className="space-y-2">
                {treatment.products.map((product, productIndex) => (
                  <div key={productIndex} className="flex gap-2">
                    <input
                      value={product}
                      onChange={(event) =>
                        updateProduct(
                          treatmentIndex,
                          productIndex,
                          event.target.value,
                        )
                      }
                      className="min-w-0 flex-1 rounded-xl border border-emerald-900/15 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
                      placeholder="Producto"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        removeProduct(treatmentIndex, productIndex)
                      }
                      className="shrink-0 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addProduct(treatmentIndex)}
                className="rounded-xl border border-emerald-900/15 px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
              >
                Agregar producto
              </button>
            </>
          )}
        </div>
      ))}

      {addableTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {addableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addTreatment(type)}
              className="rounded-xl border border-emerald-900/15 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
            >
              Agregar {TREATMENT_TYPE_LABELS[type].toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
