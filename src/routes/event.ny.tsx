import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "../components/app-shell";
import { EventForm } from "../components/event-form";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/event/ny")({
  head: () => ({
    meta: [
      { title: "Nytt event – Kransbokning" },
      { name: "description", content: "Lägg upp ett nytt kransbindningsevent." },
      { property: "og:title", content: "Nytt event – Kransbokning" },
      { property: "og:description", content: "Lägg upp ett nytt kransbindningsevent." },
    ],
  }),
  component: NyttEvent,
});

function NyttEvent() {
  const { saveEvent } = useStore();
  const navigate = useNavigate();

  return (
    <AppShell title="Nytt event" back={{ to: "/event", label: "Event" }}>
      <EventForm
        submitLabel="Spara event"
        onSave={(ev) => {
          saveEvent(ev);
          toast.success("Eventet är sparat");
          navigate({ to: "/event/$id", params: { id: ev.id } });
        }}
      />
    </AppShell>
  );
}