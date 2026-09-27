import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, Users, ShoppingBasket, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Hem", icon: Home },
  { to: "/event", label: "Event", icon: CalendarDays },
  { to: "/bokningar", label: "Bokningar", icon: Users },
  { to: "/material", label: "Material", icon: ShoppingBasket },
  { to: "/mer", label: "Mer", icon: MoreHorizontal },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: { to: string; label?: string };
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/90 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        {back && (
          <Link
            to={back.to}
            className="mb-1 inline-block text-sm font-medium text-primary"
          >
            ‹ {back.label ?? "Tillbaka"}
          </Link>
        )}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl leading-tight text-foreground">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      <main className="px-5 py-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="grid grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
      <p className="font-display text-lg text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "ok" | "warn" | "full"; children: ReactNode }) {
  const map = {
    ok: "bg-primary/10 text-primary",
    warn: "bg-highlight/15 text-highlight",
    full: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[tone]}`}>{children}</span>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" | "green" }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-xl ${
          tone === "red" ? "text-destructive" : tone === "green" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}