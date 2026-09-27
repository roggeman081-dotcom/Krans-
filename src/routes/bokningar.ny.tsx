import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, EmptyState } from "../components/app-shell";
import { BookingForm } from "../components/booking-form";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/bokningar/ny")({
  validateSearch: (search: Record<string, unknown>) => ({
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ny bokning – Kransbokning" },
      { name: "description", content: "Lägg till en kund på ett event." },
      { property: "og:title", content: "Ny bokning – Kransbokning" },
      { property: "og:description", content: "Lägg till en kund på ett event." },
    ],
  }),
  component: NyBokning,
});

function NyBokning() {
  const { event } = Route.useSearch();
  const { data, ready, saveBooking } = useStore();
  const navigate = useNavigate();

  return (
    <AppShell title="Ny bokning" back={{ to: "/bokningar", label: "Bokningar" }}>
      {!ready ? (
        <p className="text-sm text-muted-foreground">Laddar …</p>
      ) : data.events.length === 0 ? (
        <EmptyState title="Inget event att boka på" text="Skapa ett event först under Event." />
      ) : (
        <BookingForm
          defaultEventId={event}
          submitLabel="Spara bokning"
          onSave={(b) => {
            saveBooking(b);
            toast.success("Bokningen är sparad");
            navigate({ to: "/bokningar" });
          }}
        />
      )}
    </AppShell>
  );
}