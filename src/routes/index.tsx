import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, UserPlus, ClipboardList, MapPin, Clock } from "lucide-react";
import { AppShell, EmptyState, Stat, StatusPill } from "../components/app-shell";
import {
  eventStats,
  formatDatum,
  kr,
  nextEvent,
  platsStatus,
  useStore,
} from "../lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kransbokning – översikt" },
      { name: "description", content: "Nästa event, platser och betalningar i en enkel överblick." },
      { property: "og:title", content: "Kransbokning – översikt" },
      { property: "og:description", content: "Nästa event, platser och betalningar i en enkel överblick." },
    ],
  }),
  component: Hem,
});

function Hem() {
  const { data, ready } = useStore();
  const ev = nextEvent(data);
  const stats = ev ? eventStats(data, ev.id) : null;
  const status = ev && stats ? platsStatus(stats.bokade, ev.maxPlatser) : null;

  return (
    <AppShell title="Kransbokning" subtitle="Din överblick">
      {!ready ? (
        <p className="text-sm text-muted-foreground">Laddar …</p>
      ) : !ev ? (
        <EmptyState title="Inget event ännu" text="Skapa ditt första event för att komma igång.">
          <Link
            to="/event/ny"
            className="inline-flex min-h-13 items-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground"
          >
            Nytt event
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-5">
          <section className="card-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nästa event
                </p>
                <h2 className="mt-1 font-display text-2xl leading-tight">{ev.namn}</h2>
              </div>
              {status && <StatusPill tone={status.tone}>{status.text}</StatusPill>}
            </div>
            <p className="mt-3 text-base font-semibold capitalize">{formatDatum(ev.datum)}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4" /> {ev.start}–{ev.slut}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" /> {ev.plats}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted px-2 py-3">
                <p className="font-display text-xl">
                  {stats!.bokade}/{ev.maxPlatser}
                </p>
                <p className="text-xs text-muted-foreground">Bokade</p>
              </div>
              <div className="rounded-xl bg-muted px-2 py-3">
                <p className="font-display text-xl">{stats!.kvar}</p>
                <p className="text-xs text-muted-foreground">Kvar</p>
              </div>
              <div className="rounded-xl bg-muted px-2 py-3">
                <p className="font-display text-xl">{stats!.paPlats}</p>
                <p className="text-xs text-muted-foreground">På plats</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Stat label="Förväntad försäljning" value={kr(stats!.intakt)} />
            <Stat label="Betalt" value={kr(stats!.betalt)} tone="green" />
            <Stat label="Obetalt" value={kr(stats!.obetalt)} tone="red" />
            <Stat label="Pris / person" value={kr(ev.pris)} />
          </section>

          <section className="space-y-3">
            <Link
              to="/bokningar/ny"
              search={{ event: ev.id }}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground"
            >
              <UserPlus className="size-5" /> Ny bokning
            </Link>
            <Link
              to="/event/ny"
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-input bg-card px-5 font-semibold"
            >
              <CalendarPlus className="size-5 text-primary" /> Nytt event
            </Link>
            <Link
              to="/event/$id/deltagare"
              params={{ id: ev.id }}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-input bg-card px-5 font-semibold"
            >
              <ClipboardList className="size-5 text-primary" /> Dagens deltagare
            </Link>
          </section>
        </div>
      )}
    </AppShell>
  );
}