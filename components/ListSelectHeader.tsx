"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Gmail-style master checkbox above a selectable list. */
export function MasterSelectCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
  trailing,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
  trailing?: ReactNode;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="h-4 w-4 shrink-0 rounded border-emerald-900/30 text-emerald-700 focus:ring-emerald-600"
        />
        <span className="text-sm font-semibold text-emerald-950">{label}</span>
      </label>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
