import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PayStatus = "obetald" | "delbetald" | "betald";
export type PayMethod = "swish" | "kontant" | "faktura" | "annat";

export type Event = {
  id: string;
  namn: string;
  datum: string; // yyyy-mm-dd
  start: string; // hh:mm
  slut: string;
  plats: string;
  maxPlatser: number;
  pris: number;
  anteckning?: string;
};

export type Booking = {
  id: string;
  eventId: string;
  namn: string;
  telefon: string;
  epost?: string;
  platser: number;
  belopp: number;
  betalstatus: PayStatus;
  betalt: number;
  betalmetod: PayMethod;
  anteckning?: string;
  paPlats?: boolean;
  skapad: string;
};

export type MaterialItem = {
  id: string;
  eventId: string;
  artikel: string;
  antal: string;
  inkopt: boolean;
  anteckning?: string;
};

export type Data = {
  events: Event[];
  bookings: Booking[];
  material: MaterialItem[];
};

const KEY = "kransbokning.v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): Data {
  const e1: Event = {
    id: "ev-nov",
    namn: "Kransbindning – Advent",
    datum: "2026-11-28",
    start: "10:00",
    slut: "13:00",
    plats: "Logen, Björkgården",
    maxPlatser: 12,
    pris: 650,
    anteckning: "Ta med sekatör om du har.",
  };
  const e2: Event = {
    id: "ev-dec",
    namn: "Julkransar & glögg",
    datum: "2026-12-05",
    start: "14:00",
    slut: "17:00",
    plats: "Logen, Björkgården",
    maxPlatser: 10,
    pris: 700,
  };
  const b = (
    eventId: string,
    namn: string,
    telefon: string,
    platser: number,
    belopp: number,
    betalstatus: PayStatus,
    betalt: number,
    betalmetod: PayMethod,
  ): Booking => ({
    id: uid(),
    eventId,
    namn,
    telefon,
    platser,
    belopp,
    betalstatus,
    betalt,
    betalmetod,
    skapad: new Date().toISOString(),
  });
  return {
    events: [e1, e2],
    bookings: [
      b("ev-nov", "Anna Lindqvist", "0701234567", 2, 1300, "betald", 1300, "swish"),
      b("ev-nov", "Johan Berg", "0736543210", 1, 650, "obetald", 0, "swish"),
      b("ev-nov", "Sara Nyström", "0709998877", 3, 1950, "delbetald", 650, "kontant"),
      b("ev-dec", "Elin Håkansson", "0702223344", 2, 1400, "obetald", 0, "faktura"),
    ],
    material: [
      { id: uid(), eventId: "ev-nov", artikel: "Stommar 30 cm", antal: "12 st", inkopt: true },
      { id: uid(), eventId: "ev-nov", artikel: "Granris", antal: "4 säckar", inkopt: false },
      { id: uid(), eventId: "ev-nov", artikel: "Fika & glögg", antal: "12 pers", inkopt: false },
      { id: uid(), eventId: "ev-dec", artikel: "Eucalyptus", antal: "3 buntar", inkopt: false },
      { id: uid(), eventId: "ev-dec", artikel: "Sammetsband, rött", antal: "10 m", inkopt: false },
    ],
  };
}

type Ctx = {
  data: Data;
  ready: boolean;
  setData: (d: Data) => void;
  saveEvent: (e: Event) => void;
  removeEvent: (id: string) => void;
  saveBooking: (b: Booking) => void;
  removeBooking: (id: string) => void;
  saveMaterial: (m: MaterialItem) => void;
  removeMaterial: (id: string) => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<Data>({ events: [], bookings: [], material: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDataState(JSON.parse(raw) as Data);
      else {
        const s = seed();
        setDataState(s);
        localStorage.setItem(KEY, JSON.stringify(s));
      }
    } catch {
      setDataState(seed());
    }
    setReady(true);
  }, []);

  const setData = (d: Data) => {
    setDataState(d);
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* fullt lagringsutrymme */
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      data,
      ready,
      setData,
      saveEvent: (e) =>
        setData({
          ...data,
          events: data.events.some((x) => x.id === e.id)
            ? data.events.map((x) => (x.id === e.id ? e : x))
            : [...data.events, e],
        }),
      removeEvent: (id) =>
        setData({
          events: data.events.filter((x) => x.id !== id),
          bookings: data.bookings.filter((x) => x.eventId !== id),
          material: data.material.filter((x) => x.eventId !== id),
        }),
      saveBooking: (b) =>
        setData({
          ...data,
          bookings: data.bookings.some((x) => x.id === b.id)
            ? data.bookings.map((x) => (x.id === b.id ? b : x))
            : [...data.bookings, b],
        }),
      removeBooking: (id) =>
        setData({ ...data, bookings: data.bookings.filter((x) => x.id !== id) }),
      saveMaterial: (m) =>
        setData({
          ...data,
          material: data.material.some((x) => x.id === m.id)
            ? data.material.map((x) => (x.id === m.id ? m : x))
            : [...data.material, m],
        }),
      removeMaterial: (id) =>
        setData({ ...data, material: data.material.filter((x) => x.id !== id) }),
    }),
    [data, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore måste användas inom StoreProvider");
  return ctx;
}

/* ---------- hjälpfunktioner ---------- */

export const kr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

export function formatDatum(datum: string) {
  const d = new Date(datum + "T00:00:00");
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function eventStats(data: Data, eventId: string) {
  const ev = data.events.find((e) => e.id === eventId);
  const bookings = data.bookings.filter((b) => b.eventId === eventId);
  const bokade = bookings.reduce((s, b) => s + b.platser, 0);
  const paPlats = bookings.filter((b) => b.paPlats).reduce((s, b) => s + b.platser, 0);
  const intakt = bookings.reduce((s, b) => s + b.belopp, 0);
  const betalt = bookings.reduce((s, b) => s + (b.betalt || 0), 0);
  const max = ev?.maxPlatser ?? 0;
  return {
    ev,
    bookings,
    bokade,
    paPlats,
    kvar: Math.max(0, max - bokade),
    intakt,
    betalt,
    obetalt: Math.max(0, intakt - betalt),
    fyllnad: max ? bokade / max : 0,
  };
}

export function platsStatus(bokade: number, max: number) {
  if (max > 0 && bokade >= max) return { text: "Fullbokat", tone: "full" as const };
  if (max > 0 && bokade / max >= 0.75) return { text: "Nästan fullt", tone: "warn" as const };
  return { text: "Lediga platser", tone: "ok" as const };
}

export function sortedEvents(data: Data) {
  return [...data.events].sort((a, b) => a.datum.localeCompare(b.datum));
}

export function nextEvent(data: Data) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = sortedEvents(data).filter((e) => e.datum >= today);
  return upcoming[0] ?? sortedEvents(data).slice(-1)[0];
}