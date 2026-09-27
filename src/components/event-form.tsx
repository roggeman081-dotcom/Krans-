import { useState } from "react";
import { Field, TextInput, TextArea, PrimaryButton } from "./form-bits";
import { uid, type Event } from "../lib/store";

export function EventForm({
  initial,
  onSave,
  submitLabel,
}: {
  initial?: Event;
  onSave: (e: Event) => void;
  submitLabel: string;
}) {
  const [namn, setNamn] = useState(initial?.namn ?? "");
  const [datum, setDatum] = useState(initial?.datum ?? "");
  const [start, setStart] = useState(initial?.start ?? "10:00");
  const [slut, setSlut] = useState(initial?.slut ?? "13:00");
  const [plats, setPlats] = useState(initial?.plats ?? "");
  const [maxPlatser, setMax] = useState(String(initial?.maxPlatser ?? 12));
  const [pris, setPris] = useState(String(initial?.pris ?? 650));
  const [anteckning, setAnteckning] = useState(initial?.anteckning ?? "");
  const [fel, setFel] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const f: Record<string, string> = {};
    if (!namn.trim()) f.namn = "Fyll i ett namn.";
    if (!datum) f.datum = "Välj datum.";
    if (!plats.trim()) f.plats = "Fyll i plats.";
    if (!Number(maxPlatser) || Number(maxPlatser) < 1) f.max = "Ange minst 1 plats.";
    if (pris === "" || Number(pris) < 0) f.pris = "Ange ett pris.";
    setFel(f);
    if (Object.keys(f).length) return;

    onSave({
      id: initial?.id ?? uid(),
      namn: namn.trim(),
      datum,
      start,
      slut,
      plats: plats.trim(),
      maxPlatser: Number(maxPlatser),
      pris: Number(pris),
      anteckning: anteckning.trim() || undefined,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Namn på eventet" error={fel.namn}>
        <TextInput value={namn} onChange={(e) => setNamn(e.target.value)} placeholder="Kransbindning – Advent" />
      </Field>
      <Field label="Datum" error={fel.datum}>
        <TextInput type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starttid">
          <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Sluttid">
          <TextInput type="time" value={slut} onChange={(e) => setSlut(e.target.value)} />
        </Field>
      </div>
      <Field label="Plats" error={fel.plats}>
        <TextInput value={plats} onChange={(e) => setPlats(e.target.value)} placeholder="Logen, Björkgården" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Max deltagare" error={fel.max}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={maxPlatser}
            onChange={(e) => setMax(e.target.value)}
          />
        </Field>
        <Field label="Pris per person" error={fel.pris}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={pris}
            onChange={(e) => setPris(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Anteckning" hint="Valfritt">
        <TextArea value={anteckning} onChange={(e) => setAnteckning(e.target.value)} />
      </Field>
      <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
    </form>
  );
}