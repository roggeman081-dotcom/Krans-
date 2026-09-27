import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, MessageSquare, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState } from "../components/app-shell";
import { TextInput } from "../components/form-bits";
import { kr, useStore } from "../lib/store";

export const Route = createFileRoute("/bokningar/")({
  head: () => ({
    meta: [
      { title: "Bokningar – Kransbokning" },
      { name: "description", content: "Sök kunder, se betalstatus och markera betalning." },
      { property: "og:title", content: "Bokningar – Kransbokning" },
      { property: "og:description", content: "Sök kunder, se betalstatus och markera betalning." },
    ],
  }),
  component: Bokningar,
});

const statusText = { obetald: "Obetald", delbetald: "Delbetald", betald: "Betald" } as const;
const statusClass = {
  obetald: "bg-destructive/10 text-destructive",
  delbetald: "bg-highlight/15 text-highlight",
  betald: "bg-primary/10 text-primary",
} as const;

function Bokningar() {
  const { data, ready, saveBooking } = useStore();
  const [q, setQ] = useState("");

  const sok = q.trim().toLowerCase();
  const lista = data.bookings
    .filter(
      (b) =>
        !sok ||
        b.namn.toLowerCase().includes(sok) ||
        b.telefon.replace(/\s/g, "").includes(sok.replace(/\s/g, "")),
    )
    .sort((a, b) => a.namn.localeCompare(b.namn, "sv"));

  return (
    <AppShell
      title="Bokningar"
      subtitle={ready ? `${data.bookings.length} bokningar` : undefined}
      action={
        <Link
          to="/bokningar/ny"
          search={{ event: undefined }}
          className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Ny bokning"
        >
          <Plus className="size-6" />
        </Link>
      }
    >
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Sök namn eller telefon"
        type="search"
      />

      <div className="mt-4 space-y-3">
        {!ready ? (
          <p className="text-sm text-muted-foreground">Laddar …</p>
        ) : lista.length === 0 ? (
          <EmptyState
            title={data.bookings.length ? "Ingen träff" : "Inga bokningar ännu"}
            text={
              data.bookings.length
                ? "Prova ett annat namn eller telefonnummer."
                : "Lägg till din första bokning med plusknappen."
            }
          />
        ) : (
          lista.map((b) => {
            const ev = data.events.find((e) => e.id === b.eventId);
            return (
              <div key={b.id} className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to="/bokningar/$id" params={{ id: b.id }} className="min-w-0">
                    <p className="font-display text-lg leading-snug">{b.namn}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {ev ? `${ev.namn} · ${ev.datum}` : "Event saknas"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.platser} platser · {kr(b.belopp)}
                    </p>
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass[b.betalstatus]}`}
                  >
                    {statusText[b.betalstatus]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${b.telefon}`}
                    className="flex min-h-12 items-center justify-center gap-1 rounded-full border border-input text-sm font-semibold"
                  >
                    <Phone className="size-4" /> Ring
                  </a>
                  <a
                    href={`sms:${b.telefon}`}
                    className="flex min-h-12 items-center justify-center gap-1 rounded-full border border-input text-sm font-semibold"
                  >
                    <MessageSquare className="size-4" /> SMS
                  </a>
                  <button
                    onClick={() => {
                      saveBooking({ ...b, betalstatus: "betald", betalt: b.belopp });
                      toast.success(`${b.namn} är markerad som betald`);
                    }}
                    disabled={b.betalstatus === "betald"}
                    className="flex min-h-12 items-center justify-center gap-1 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    <Check className="size-4" /> Betald
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}