import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, EmptyState, Stat, StatusPill } from "../components/app-shell";
import { EventForm } from "../components/event-form";
import { DangerButton, GhostButton } from "../components/form-bits";
import { eventStats, formatDatum, kr, platsStatus, useStore } from "../lib/store";
import { exportCsv } from "../lib/exporters";

export const Route = createFileRoute("/event/$id")({
  head: () => ({
    meta: [
      { title: "Event – Kransbokning" },
      { name: "description", content: "Detaljer, platser och ekonomi för eventet." },
      { property: "og:title", content: "Event – Kransbokning" },
      { property: "og:description", content: "Detaljer, platser och ekonomi för eventet." },
    ],
  }),
  component: EventDetalj,
});

function EventDetalj() {
  const { id } = Route.useParams();
  const { data, ready, saveEvent, removeEvent } = useStore();
  const navigate = useNavigate();
  const [redigerar, setRedigerar] = useState(false);
  const s = eventStats(data, id);
  const ev = s.ev;

  if (!ready) {
    return (
      <AppShell title="Event" back={{ to: "/event", label: "Event" }}>
        <p className="text-sm text-muted-foreground">Laddar …</p>
      </AppShell>
    );
  }

  if (!ev) {
    return (
      <AppShell title="Event" back={{ to: "/event", label: "Event" }}>
        <EmptyState title="Eventet finns inte" text="Det kan ha tagits bort." />
      </AppShell>
    );
  }

  const status = platsStatus(s.bokade, ev.maxPlatser);

  if (redigerar) {
    return (
      <AppShell title="Redigera event" back={{ to: "/event", label: "Event" }}>
        <EventForm
          initial={ev}
          submitLabel="Spara ändringar"
          onSave={(next) => {
            saveEvent(next);
            setRedigerar(false);
            toast.success("Ändringarna är sparade");
          }}
        />
        <div className="mt-3">
          <GhostButton onClick={() => setRedigerar(false)}>Avbryt</GhostButton>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={ev.namn} back={{ to: "/event", label: "Event" }}>
      <div className="space-y-5">
        <section className="card-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold capitalize">{formatDatum(ev.datum)}</p>
              <p className="text-sm text-muted-foreground">
                {ev.start}–{ev.slut}
              </p>
              <p className="text-sm text-muted-foreground">{ev.plats}</p>
            </div>
            <StatusPill tone={status.tone}>{status.text}</StatusPill>
          </div>
          {ev.anteckning && (
            <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm">{ev.anteckning}</p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Stat label="Platser" value={`${s.bokade}/${ev.maxPlatser}`} />
          <Stat label="Kvar" value={String(s.kvar)} />
          <Stat label="Intäkt" value={kr(s.intakt)} />
          <Stat label="Betalt" value={kr(s.betalt)} tone="green" />
          <Stat label="Obetalt" value={kr(s.obetalt)} tone="red" />
          <Stat label="Pris / person" value={kr(ev.pris)} />
        </section>

        <section className="space-y-3">
          <Link
            to="/event/$id/deltagare"
            params={{ id: ev.id }}
            className="flex min-h-14 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
          >
            Deltagarlista
          </Link>
          <Link
            to="/bokningar/ny"
            search={{ event: ev.id }}
            className="flex min-h-14 items-center justify-center rounded-full border border-input bg-card px-6 font-semibold"
          >
            Ny bokning
          </Link>
          <Link
            to="/material"
            search={{ event: ev.id }}
            className="flex min-h-14 items-center justify-center rounded-full border border-input bg-card px-6 font-semibold"
          >
            Material till eventet
          </Link>
          <GhostButton onClick={() => exportCsv(data, ev)}>Exportera deltagare (CSV)</GhostButton>
          <GhostButton onClick={() => setRedigerar(true)}>Redigera event</GhostButton>
          <DangerButton
            onClick={() => {
              if (confirm("Ta bort eventet och alla dess bokningar?")) {
                removeEvent(ev.id);
                toast.success("Eventet är borttaget");
                navigate({ to: "/event" });
              }
            }}
          >
            Ta bort event
          </DangerButton>
        </section>
      </div>
    </AppShell>
  );
}