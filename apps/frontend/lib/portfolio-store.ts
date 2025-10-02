export type PortfolioRecord = {
  id: string;
  name: string;
  status: "Green" | "At risk" | "Delayed" | "Planning";
  owner: string;
  updatedAt: string;
  slaHours: number;
  monthlyCost: number;
  occupancy: number;
  incidents: number;
};

const initialRecords: PortfolioRecord[] = [
  {
    id: "prop-1",
    name: "Atrium Center",
    status: "Green",
    owner: "Casey Wynn",
    updatedAt: "2024-11-04T15:05:00.000Z",
    slaHours: 12,
    monthlyCost: 48000,
    occupancy: 92,
    incidents: 1
  },
  {
    id: "prop-2",
    name: "Harbor Tower",
    status: "At risk",
    owner: "Jules Moreno",
    updatedAt: "2024-11-03T09:20:00.000Z",
    slaHours: 4,
    monthlyCost: 72000,
    occupancy: 87,
    incidents: 4
  },
  {
    id: "prop-3",
    name: "North Loop Campus",
    status: "Delayed",
    owner: "Sydney Patel",
    updatedAt: "2024-11-01T12:10:00.000Z",
    slaHours: 30,
    monthlyCost: 56000,
    occupancy: 81,
    incidents: 3
  },
  {
    id: "prop-4",
    name: "Quartz Labs",
    status: "Planning",
    owner: "Amelia Chen",
    updatedAt: "2024-10-28T08:12:00.000Z",
    slaHours: 48,
    monthlyCost: 39500,
    occupancy: 68,
    incidents: 6
  },
  {
    id: "prop-5",
    name: "Riverside Commons",
    status: "Green",
    owner: "Jonah Walker",
    updatedAt: "2024-11-05T18:30:00.000Z",
    slaHours: 16,
    monthlyCost: 61000,
    occupancy: 95,
    incidents: 0
  },
  {
    id: "prop-6",
    name: "Summit Hub",
    status: "At risk",
    owner: "Bryn Lee",
    updatedAt: "2024-11-02T16:02:00.000Z",
    slaHours: 10,
    monthlyCost: 45200,
    occupancy: 78,
    incidents: 5
  }
];

const store = new Map<string, PortfolioRecord>();
let seeded = false;

function ensureSeeded() {
  if (!seeded) {
    initialRecords.forEach((record) => {
      store.set(record.id, { ...record });
    });
    seeded = true;
  }
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row_${Math.random().toString(36).slice(2, 10)}`;
}

export function listPortfolioRecords(): PortfolioRecord[] {
  ensureSeeded();
  return Array.from(store.values());
}

export function createPortfolioRecord(partial?: Partial<PortfolioRecord>): PortfolioRecord {
  ensureSeeded();
  const id = createId();
  const now = new Date().toISOString();
  const record: PortfolioRecord = {
    id,
    name: partial?.name ?? "New property",
    status: partial?.status ?? "Planning",
    owner: partial?.owner ?? "Unassigned",
    updatedAt: now,
    slaHours: partial?.slaHours ?? 12,
    monthlyCost: partial?.monthlyCost ?? 25000,
    occupancy: partial?.occupancy ?? 80,
    incidents: partial?.incidents ?? 0
  };
  store.set(id, record);
  return record;
}

export function updatePortfolioRecord(id: string, patch: Partial<PortfolioRecord>): PortfolioRecord | null {
  ensureSeeded();
  const existing = store.get(id);
  if (!existing) {
    return null;
  }
  const updated = {
    ...existing,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString()
  } satisfies PortfolioRecord;
  store.set(id, updated);
  return updated;
}

export function deletePortfolioRecord(id: string) {
  ensureSeeded();
  store.delete(id);
}
