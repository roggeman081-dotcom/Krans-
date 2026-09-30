import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarPlus,
  UserPlus,
  Phone,
  MessageSquare,
  Mail,
  Users,
  WalletCards,
  Banknote,
} from "lucide-react";
import { AppShell, EmptyState, Stat, StatusPill } from "../components/app-shell";
import {
  eventStats,
  formatDatum,
  kr,
  platsStatus,
  sortedEvents,
  useStore,
} from "../lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kransbokning – Lindas översikt" },
      {
        name: "description",
        content: "Alla event, bokningar, platser, kontaktuppgifter och betalningar på en sida.",
      },
      { property: "og:title", content: "Kransbokning – Lindas översikt" },
      {
        property: "og:description",
        content: "Alla event, bokningar, platser, kontaktuppgifter och betalningar på en sida.",
      },
    ],
  }),
  component: Hem,
});

const statusText = {
  obetald: "Obetald",
  delbetald: "Delbetald",
  betald: "Betald",
} as const;

const statusClass = {
  obetald: "bg-destructive/10 text-destructive",
  delbetald: "bg-highlight/15 text-highlight",
  betald: "bg-primary/10 text-primary",
} as const;

function Hem() {
  const { data, ready } = useStore();
  const events = sortedEvents(data);

  const totalPlatser = data.bookings.reduce((sum, b) => sum + b.platser, 0);
  const totalIntakt = data.bookings.reduce((sum, b) => sum + b.belopp, 0);
  const totalBetalt = data.bookings.reduce((sum, b) => sum + (b.betalt || 0), 0);

  return (
    <AppShell title="Kransbokning" subtitle="Lindas samlade bokningsöversikt">
      {!ready ? (
        <p className="text-sm text-muted-foreground">Laddar …</p>
      ) : events.length === 0 ? (
        <EmptyState title="Inga tillfällen ännu" text="Skapa första tillfället för att komma igång.">
          <Link
            to="/event/ny"
            className="inline-flex min-h-13 items-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground"
          >
            Nytt tillfälle
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3">
            <Stat label="Bokningar" value={String(data.bookings.length)} />
            <Stat label="Personer bokade" value={String(totalPlatser)} tone="green" />
            <Stat label="Förväntad försäljning" value={kr(totalIntakt)} />
            <Stat label="Betalt" value={kr(totalBetalt)} tone="green" />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Link
              to="/bokningar/ny"
              search={{ event: undefined }}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground"
            >
              <UserPlus className="size-5" /> Ny bokning
            </Link>
            <Link
              to="/event/ny"
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-input bg-card px-4 font-semibold"
            >
              <CalendarPlus className="size-5 text-primary" /> Nytt tillfälle
            </Link>
          </section>

          <section className="space-y-5">
            {events.map((ev) => {
              const s = eventStats(data, ev.id);
              const status = platsStatus(s.bokade, ev.maxPlatser);

              return (
                <div key={ev.id} className="card-surface overflow-hidden">
                  <div className="border-b border-border p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {formatDatum(ev.datum)}
                        </p>
                        <h2 className="mt-1 font-display text-2xl leading-tight">{ev.namn}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ev.start}–{ev.slut}
                          {ev.plats ? ` · ${ev.plats}` : ""}
                        </p>
                      </div>
                      <StatusPill tone={status.tone}>{status.text}</StatusPill>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-xl bg-muted px-2 py-3">
                        <Users className="mx-auto mb-1 size-4 text-muted-foreground" />
                        <p className="font-display text-lg">{s.bokade}/{ev.maxPlatser}</p>
                        <p className="text-[11px] text-muted-foreground">Bokade</p>
                      </div>
                      <div className="rounded-xl bg-muted px-2 py-3">
                        <p className="font-display text-lg">{s.kvar}</p>
                        <p className="text-[11px] text-muted-foreground">Kvar</p>
                      </div>
                      <div className="rounded-xl bg-muted px-2 py-3">
                        <WalletCards className="mx-auto mb-1 size-4 text-muted-foreground" />
                        <p className="font-display text-lg">{kr(s.intakt)}</p>
                        <p className="text-[11px] text-muted-foreground">Totalt</p>
                      </div>
                      <div className="rounded-xl bg-muted px-2 py-3">
                        <Banknote className="mx-auto mb-1 size-4 text-muted-foreground" />
                        <p className="font-display text-lg">{kr(s.betalt)}</p>
                        <p className="text-[11px] text-muted-foreground">Betalt</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-xl">Bokade</h3>
                      <span className="text-sm text-muted-foreground">
                        {s.bookings.length} {s.bookings.length === 1 ? "bokning" : "bokningar"}
                      </span>
                    </div>

                    {s.bookings.length === 0 ? (
                      <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                        Inga bokningar ännu.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {s.bookings.map((b) => (
                          <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                              <Link to="/bokningar/$id" params={{ id: b.id }} className="min-w-0">
                                <p className="font-display text-lg leading-tight">{b.namn}</p>
                                <p className="mt-1 text-sm font-semibold">
                                  {b.platser} {b.platser === 1 ? "person" : "personer"} · {kr(b.belopp)}
                                </p>
                              </Link>
                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass[b.betalstatus]}`}
                              >
                                {statusText[b.betalstatus]}
                              </span>
                            </div>

                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                              <a href={`tel:${b.telefon}`} className="flex items-center gap-2">
                                <Phone className="size-4" /> {b.telefon}
                              </a>
                              {b.epost && (
                                <a href={`mailto:${b.epost}`} className="flex items-center gap-2 break-all">
                                  <Mail className="size-4" /> {b.epost}
                                </a>
                              )}
                              {b.anteckning && (
                                <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-foreground">
                                  {b.anteckning}
                                </p>
                              )}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <a
                                href={`tel:${b.telefon}`}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-input text-sm font-semibold"
                              >
                                <Phone className="size-4" /> Ring
                              </a>
                              <a
                                href={`sms:${b.telefon}`}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-input text-sm font-semibold"
                              >
                                <MessageSquare className="size-4" /> SMS
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </AppShell>
  );
}
