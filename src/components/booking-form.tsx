import { useState } from "react";
import { Field, TextInput, TextArea, SelectInput, PrimaryButton } from "./form-bits";
import { uid, useStore, type Booking, type PayMethod, type PayStatus } from "../lib/store";

export function BookingForm({
  initial,
  defaultEventId,
  onSave,
  submitLabel,
}: {
  initial?: Booking;
  defaultEventId?: string;
  onSave: (b: Booking) => void;
  submitLabel: string;
}) {
  const { data } = useStore();
  const events = [...data.events].sort((a, b) => a.datum.localeCompare(b.datum));

  const [eventId, setEventId] = useState(initial?.eventId ?? defaultEventId ?? events[0]?.id ?? "");
  const [namn, setNamn] = useState(initial?.namn ?? "");
  const [telefon, setTelefon] = useState(initial?.telefon ?? "");
  const [epost, setEpost] = useState(initial?.epost ?? "");
  const [platser, setPlatser] = useState(String(initial?.platser ?? 1));
  const [belopp, setBelopp] = useState(initial ? String(initial.belopp) : "");
  const [betalstatus, setBetalstatus] = useState<PayStatus>(initial?.betalstatus ?? "obetald");
  const [betalt, setBetalt] = useState(String(initial?.betalt ?? 0));
  const [betalmetod, setBetalmetod] = useState<PayMethod>(initial?.betalmetod ?? "swish");
  const [anteckning, setAnteckning] = useState(initial?.anteckning ?? "");
  const [fel, setFel] = useState<Record<string, string>>({});

  const valtEvent = data.events.find((e) => e.id === eventId);
  const forslag = valtEvent ? valtEvent.pris * (Number(platser) || 0) : 0;
  const beloppVarde = belopp === "" ? String(forslag) : belopp;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const f: Record<string, string> = {};
    if (!eventId) f.event = "Välj ett event.";
    if (!namn.trim()) f.namn = "Fyll i kundens namn.";
    if (telefon.replace(/\D/g, "").length < 6) f.telefon = "Fyll i ett mobilnummer.";
    if (!Number(platser) || Number(platser) < 1) f.platser = "Minst 1 plats.";
    if (epost && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)) f.epost = "Kontrollera e-postadressen.";
    setFel(f);
    if (Object.keys(f).length) return;

    const total = Number(beloppVarde) || 0;
    const betaltNu =
      betalstatus === "betald" ? total : betalstatus === "obetald" ? 0 : Number(betalt) || 0;

    onSave({
      id: initial?.id ?? uid(),
      eventId,
      namn: namn.trim(),
      telefon: telefon.trim(),
      epost: epost.trim() || undefined,
      platser: Number(platser),
      belopp: total,
      betalstatus,
      betalt: betaltNu,
      betalmetod,
      anteckning: anteckning.trim() || undefined,
      paPlats: initial?.paPlats ?? false,
      skapad: initial?.skapad ?? new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Event" error={fel.event}>
        <SelectInput value={eventId} onChange={(e) => setEventId(e.target.value)}>
          <option value="">Välj event</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.namn} · {e.datum}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Kundnamn" error={fel.namn}>
        <TextInput value={namn} onChange={(e) => setNamn(e.target.value)} placeholder="Anna Lindqvist" />
      </Field>
      <Field label="Mobilnummer" error={fel.telefon}>
        <TextInput
          type="tel"
          inputMode="tel"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="070 123 45 67"
        />
      </Field>
      <Field label="E-post" hint="Valfritt" error={fel.epost}>
        <TextInput type="email" value={epost} onChange={(e) => setEpost(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Antal platser" error={fel.platser}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={platser}
            onChange={(e) => setPlatser(e.target.value)}
          />
        </Field>
        <Field label="Belopp" hint={valtEvent ? `Förslag: ${forslag} kr` : undefined}>
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={beloppVarde}
            onChange={(e) => setBelopp(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Betalstatus">
        <SelectInput
          value={betalstatus}
          onChange={(e) => setBetalstatus(e.target.value as PayStatus)}
        >
          <option value="obetald">Obetald</option>
          <option value="delbetald">Delbetald</option>
          <option value="betald">Betald</option>
        </SelectInput>
      </Field>
      {betalstatus === "delbetald" && (
        <Field label="Betalt så här långt">
          <TextInput
            type="number"
            inputMode="numeric"
            min={0}
            value={betalt}
            onChange={(e) => setBetalt(e.target.value)}
          />
        </Field>
      )}
      <Field label="Betalmetod">
        <SelectInput value={betalmetod} onChange={(e) => setBetalmetod(e.target.value as PayMethod)}>
          <option value="swish">Swish</option>
          <option value="kontant">Kontant</option>
          <option value="faktura">Faktura</option>
          <option value="annat">Annat</option>
        </SelectInput>
      </Field>
      <Field label="Anteckning" hint="Valfritt">
        <TextArea value={anteckning} onChange={(e) => setAnteckning(e.target.value)} />
      </Field>
      <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
    </form>
  );
}