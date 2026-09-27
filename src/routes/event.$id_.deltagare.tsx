import { createFileRoute } from "@tanstack/react-router";
import { AppShell, EmptyState, Stat } from "../components/app-shell";
import { GhostButton } from "../components/form-bits";
import { eventStats, formatDatum, useStore } from "../lib/store";
import { exportCsv } from "../lib/exporters";

export const Route = createFileRoute("/event/$id_/deltagare")({
  head: () => ({
    meta: [
      { title: "Deltagarlista – Kransbokning" },
      { name: "description", content: "Deltagare, platser, betalstatus och check-in." },
      { property: "og:title", content: "Deltagarlista – Kransbokning" },
      { property: "og:description", content: "Deltagare, platser, betalstatus och check-in." },
    ],
  }),
  component: Deltagare,
});

const statusText = { obetald: "Obetald", delbetald: "Delbetald", betald: "Betald" } as const;

function Deltagare() {
  const { id } = Route.useParams();
  const { data, ready, saveBooking } = useStore();
  const s = eventStats(data, id);
  const ev = s.ev;

  if (!ready || !ev) {
    return (
      <AppShell title="Deltagare" back={{ to: "/event", label: "Event" }}>
        <p className="text-sm text-muted-foreground">{ready ? "Eventet finns inte." : "Laddar …"}</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Deltagarlista"
      subtitle={`${ev.namn} · ${formatDatum(ev.datum)}`}
      back={{ to: "/event", label: "Event" }}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Bokade" value={String(s.bokade)} />
        <Stat label="På plats" value={String(s.paPlats)} tone="green" />
        <Stat label="Kvar" value={String(s.kvar)} />
      </div>

      <div className="mt-5 space-y-3">
        {s.bookings.length === 0 ? (
          <EmptyState title="Inga deltagare ännu" text="Lägg till en bokning för det här eventet." />
        ) : (
          s.bookings.map((b) => (
            <div key={b.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg leading-snug">{b.namn}</p>
                  <p className="text-sm text-muted-foreground">
                    {b.platser} {b.platser === 1 ? "plats" : "platser"} ·{" "}
                    {statusText[b.betalstatus]}
                  </p>
                </div>
                {b.paPlats && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    På plats
                  </span>
                )}
              </div>
              <div className="mt-3">
                <GhostButton
                  onClick={() => saveBooking({ ...b, paPlats: !b.paPlats })}
                  className={b.paPlats ? "" : "border-primary/40 text-primary"}
                >
                  {b.paPlats ? "Ångra check-in" : "På plats"}
                </GhostButton>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5">
        <GhostButton onClick={() => exportCsv(data, ev)}>Exportera lista (CSV)</GhostButton>
      </div>
    </AppShell>
  );
}