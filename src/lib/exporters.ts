import { eventStats, type Data, type Event } from "./store";

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(data: Data) {
  const stamp = new Date().toISOString().slice(0, 10);
  download(
    `kransbokning-backup-${stamp}.json`,
    JSON.stringify({ version: 1, exporterad: new Date().toISOString(), ...data }, null, 2),
    "application/json",
  );
}

const statusText = { obetald: "Obetald", delbetald: "Delbetald", betald: "Betald" } as const;

export function exportCsv(data: Data, ev: Event) {
  const { bookings } = eventStats(data, ev.id);
  const rows = [
    ["Namn", "Telefon", "E-post", "Platser", "Belopp", "Betalt", "Betalstatus", "Betalmetod", "På plats", "Anteckning"],
    ...bookings.map((b) => [
      b.namn,
      b.telefon,
      b.epost ?? "",
      String(b.platser),
      String(b.belopp),
      String(b.betalt ?? 0),
      statusText[b.betalstatus],
      b.betalmetod,
      b.paPlats ? "Ja" : "Nej",
      b.anteckning ?? "",
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const safe = ev.namn.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  download(`deltagare-${safe}-${ev.datum}.csv`, "\uFEFF" + csv, "text/csv;charset=utf-8");
}

export function parseImport(text: string): Data {
  const parsed = JSON.parse(text) as Partial<Data>;
  if (!Array.isArray(parsed.events) || !Array.isArray(parsed.bookings)) {
    throw new Error("Filen ser inte ut som en Kransbokning-backup.");
  }
  return {
    events: parsed.events,
    bookings: parsed.bookings,
    material: Array.isArray(parsed.material) ? parsed.material : [],
  };
}