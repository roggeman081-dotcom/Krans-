import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell, EmptyState } from "../components/app-shell";
import { BookingForm } from "../components/booking-form";
import { DangerButton } from "../components/form-bits";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/bokningar/$id")({
  head: () => ({
    meta: [
      { title: "Bokning – Kransbokning" },
      { name: "description", content: "Redigera kundens bokning och betalning." },
      { property: "og:title", content: "Bokning – Kransbokning" },
      { property: "og:description", content: "Redigera kundens bokning och betalning." },
    ],
  }),
  component: RedigeraBokning,
});

function RedigeraBokning() {
  const { id } = Route.useParams();
  const { data, ready, saveBooking, removeBooking } = useStore();
  const navigate = useNavigate();
  const bokning = data.bookings.find((b) => b.id === id);

  return (
    <AppShell title="Bokning" back={{ to: "/bokningar", label: "Bokningar" }}>
      {!ready ? (
        <p className="text-sm text-muted-foreground">Laddar …</p>
      ) : !bokning ? (
        <EmptyState title="Bokningen finns inte" text="Den kan ha tagits bort." />
      ) : (
        <>
          <BookingForm
            initial={bokning}
            submitLabel="Spara ändringar"
            onSave={(b) => {
              saveBooking(b);
              toast.success("Ändringarna är sparade");
              navigate({ to: "/bokningar" });
            }}
          />
          <div className="mt-3">
            <DangerButton
              onClick={() => {
                if (confirm("Ta bort bokningen?")) {
                  removeBooking(bokning.id);
                  toast.success("Bokningen är borttagen");
                  navigate({ to: "/bokningar" });
                }
              }}
            >
              Ta bort bokning
            </DangerButton>
          </div>
        </>
      )}
    </AppShell>
  );
}