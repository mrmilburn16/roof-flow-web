"use client";

import { useState, useCallback, useEffect } from "react";
import { Target, Plus, X } from "lucide-react";
import { useMockDb } from "@/lib/mock/MockDbProvider";
import { PageTitle, card, inputBase, btnPrimary, btnSecondary } from "@/components/ui";

export default function VisionPage() {
  const { getVision, setVision, hasPermission } = useMockDb();
  const vision = getVision();
  const canEdit = hasPermission("manage_team") || hasPermission("manage_roles");

  const [purpose, setPurpose] = useState(vision.purpose);
  const [coreValues, setCoreValues] = useState<string[]>(vision.coreValues);
  const [focus, setFocus] = useState(vision.focus);
  const [newValue, setNewValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPurpose(vision.purpose);
    setCoreValues(vision.coreValues ?? []);
    setFocus(vision.focus);
  }, [vision.purpose, vision.focus, vision.coreValues]);

  const handleSave = useCallback(() => {
    setVision({ purpose, coreValues, focus });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [purpose, coreValues, focus, setVision]);

  const addValue = () => {
    const v = newValue.trim();
    if (v && !coreValues.includes(v)) {
      setCoreValues((prev) => [...prev, v]);
      setNewValue("");
    }
  };

  const removeValue = (index: number) => {
    setCoreValues((prev) => prev.filter((_, i) => i !== index));
  };

  const isDirty =
    purpose !== vision.purpose ||
    focus !== vision.focus ||
    coreValues.length !== vision.coreValues.length ||
    coreValues.some((v, i) => v !== vision.coreValues[i]);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Vision & Focus"
        subtitle="Purpose, core values, and where you're headed. Align the team around what matters."
      />

      <div className={card}>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <Target className="size-5 text-[var(--text-muted)]" />
            Company vision
          </div>
        </div>
        <div className="space-y-6 p-5">
          <div>
            <label htmlFor="vision-purpose" className="block text-[13px] font-medium text-[var(--text-primary)]">
              Purpose
            </label>
            <textarea
              id="vision-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={!canEdit}
              placeholder="Why we exist"
              rows={2}
              className={`${inputBase} mt-1.5`}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-primary)]">
              Core values
            </label>
            <ul className="mt-1.5 space-y-1.5">
              {coreValues.map((v, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded bg-[var(--muted-bg)] px-3 py-1.5 text-[14px] text-[var(--text-primary)]">
                    {v}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeValue(i)}
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                      aria-label={`Remove ${v}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValue())}
                  placeholder="Add a value"
                  className={`${inputBase} max-w-xs`}
                />
                <button type="button" onClick={addValue} className={btnSecondary + " shrink-0"}>
                  <Plus className="size-4" />
                  Add
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="vision-focus" className="block text-[13px] font-medium text-[var(--text-primary)]">
              Focus (1–3 year target)
            </label>
            <textarea
              id="vision-focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              disabled={!canEdit}
              placeholder="Where we're headed"
              rows={3}
              className={`${inputBase} mt-1.5`}
            />
          </div>
          {canEdit && isDirty && (
            <div className="flex gap-2 border-t border-[var(--border)] pt-4">
              <button onClick={handleSave} className={btnPrimary}>
                {saved ? "Saved" : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
