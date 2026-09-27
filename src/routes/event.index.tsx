import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, StatusPill } from "../components/app-shell";
import { eventStats, formatDatum, kr, platsStatus, sortedEvents, useStore } from "../lib/store";

export const Route = createFileRoute("/event/")({
  head: () => ({
    meta: [
      { title: "Event – Kransbokning" },
      { name: "description", content: "Alla kransbindningsevent med platser och status." },
      { property: "og:title", content: "Event – Kransbokning" },
      { property: "og:description", content: "Alla kransbindningsevent med platser och status." },
    ],
  }),
  component: EventLista,
});

function EventLista() {
  const { data, ready } = useStore();
  const events = sortedEvents(data);

  return (
    <AppShell
      title="Event"
      subtitle={ready ? `${events.length} event` : undefined}
      action={
        <Link
          to="/event/ny"
          className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Nytt event"
        >
          <Plus className="size-6" />
        </Link>
      }
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">Laddar …</p>
      ) : events.length === 0 ? (
        <EmptyState title="Inga event" text="Lägg till ditt första event med plusknappen." />
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const s = eventStats(data, ev.id);
            const status = platsStatus(s.bokade, ev.maxPlatser);
            return (
              <li key={ev.id}>
                <Link to="/event/$id" params={{ id: ev.id }} className="block card-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg leading-snug">{ev.namn}</h2>
                      <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                        {formatDatum(ev.datum)} · {ev.start}
                      </p>
                      <p className="text-sm text-muted-foreground">{ev.plats}</p>
                    </div>
                    <StatusPill tone={status.tone}>{status.text}</StatusPill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold">
                      {s.bokade}/{ev.maxPlatser} platser
                    </span>
                    <span className="text-muted-foreground">{s.kvar} kvar</span>
                    <span className="text-muted-foreground">{kr(s.intakt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}