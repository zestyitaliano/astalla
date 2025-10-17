import { notFound } from "next/navigation";

import type { SchemaGraph } from "@shared/api";

import { DevReferencesClient } from "./dev-references-client";

const DEMO_SCHEMA: SchemaGraph = {
  tables: [
    {
      id: "leases",
      name: "Leases",
      label: "Leases",
      columns: [
        { id: "lease-id", name: "Id", type: "NUMBER" },
        { id: "lease-property-id", name: "PropertyId", type: "TEXT" },
        { id: "lease-lead-id", name: "LeadId", type: "TEXT" },
        { id: "lease-status", name: "Status", type: "TEXT" },
        { id: "lease-start", name: "StartDate", type: "DATE" },
        { id: "lease-end", name: "EndDate", type: "DATE" },
        { id: "lease-rent", name: "Rent", type: "NUMBER" }
      ],
      fks: [
        { fromTable: "Leases", fromCol: "PropertyId", toTable: "Properties", toCol: "Id" },
        { fromTable: "Leases", fromCol: "LeadId", toTable: "Leads", toCol: "Id" }
      ]
    },
    {
      id: "properties",
      name: "Properties",
      label: "Properties",
      columns: [
        { id: "property-id", name: "Id", type: "TEXT" },
        { id: "property-name", name: "Name", type: "TEXT" },
        { id: "property-region", name: "Region", type: "TEXT" },
        { id: "property-units", name: "Units", type: "NUMBER" }
      ],
      fks: []
    },
    {
      id: "leads",
      name: "Leads",
      label: "Leads",
      columns: [
        { id: "lead-id", name: "Id", type: "TEXT" },
        { id: "lead-property-id", name: "PropertyId", type: "TEXT" },
        { id: "lead-source", name: "Source", type: "TEXT" },
        { id: "lead-cost", name: "Cost", type: "NUMBER" },
        { id: "lead-created", name: "CreatedAt", type: "DATE" },
        { id: "lead-ratio", name: "TourToLeaseRatio", type: "NUMBER" }
      ],
      fks: [
        { fromTable: "Leads", fromCol: "PropertyId", toTable: "Properties", toCol: "Id" }
      ]
    },
    {
      id: "applications",
      name: "Applications",
      label: "Applications",
      columns: [
        { id: "application-id", name: "Id", type: "TEXT" },
        { id: "application-lead-id", name: "LeadId", type: "TEXT" },
        { id: "application-status", name: "Status", type: "TEXT" },
        { id: "application-decision", name: "DecisionSeconds", type: "NUMBER" },
        { id: "application-submitted", name: "SubmittedAt", type: "DATE" }
      ],
      fks: [
        { fromTable: "Applications", fromCol: "LeadId", toTable: "Leads", toCol: "Id" }
      ]
    }
  ]
};

const DEMO_DATASET = {
  Leases: [
    {
      Id: "L-1001",
      PropertyId: "P-200",
      LeadId: "LD-5001",
      Status: "active",
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Rent: 1825
    },
    {
      Id: "L-1002",
      PropertyId: "P-200",
      LeadId: "LD-5002",
      Status: "active",
      StartDate: "2024-02-01",
      EndDate: "2025-01-31",
      Rent: 1940
    },
    {
      Id: "L-1003",
      PropertyId: "P-300",
      LeadId: "LD-5003",
      Status: "renewed",
      StartDate: "2023-11-01",
      EndDate: "2024-10-31",
      Rent: 1750
    },
    {
      Id: "L-1004",
      PropertyId: "P-400",
      LeadId: "LD-5004",
      Status: "terminated",
      StartDate: "2024-04-01",
      EndDate: "2024-09-30",
      Rent: 1650
    }
  ],
  Properties: [
    { Id: "P-200", Name: "Lakeside", Region: "North", Units: 120 },
    { Id: "P-300", Name: "Maple Court", Region: "North", Units: 86 },
    { Id: "P-400", Name: "Downtown Lofts", Region: "Downtown", Units: 64 }
  ],
  Leads: [
    {
      Id: "LD-5001",
      PropertyId: "P-200",
      Source: "Portal",
      Cost: 120,
      CreatedAt: "2024-05-12",
      TourToLeaseRatio: 0.64
    },
    {
      Id: "LD-5002",
      PropertyId: "P-200",
      Source: "Portal",
      Cost: 110,
      CreatedAt: "2024-06-08",
      TourToLeaseRatio: 0.53
    },
    {
      Id: "LD-5003",
      PropertyId: "P-300",
      Source: "Social",
      Cost: 85,
      CreatedAt: "2024-07-22",
      TourToLeaseRatio: 0.48
    },
    {
      Id: "LD-5004",
      PropertyId: "P-400",
      Source: "Search",
      Cost: 95,
      CreatedAt: "2024-08-14",
      TourToLeaseRatio: 0.42
    }
  ],
  Applications: [
    {
      Id: "APP-9001",
      LeadId: "LD-5001",
      Status: "approved",
      DecisionSeconds: 68400,
      SubmittedAt: "2024-05-16"
    },
    {
      Id: "APP-9002",
      LeadId: "LD-5002",
      Status: "approved",
      DecisionSeconds: 91200,
      SubmittedAt: "2024-06-12"
    },
    {
      Id: "APP-9003",
      LeadId: "LD-5003",
      Status: "pending",
      DecisionSeconds: 0,
      SubmittedAt: "2024-07-25"
    }
  ]
} as const;

export default function DevReferencesPage() {
  const enabled =
    process.env.NEXT_PUBLIC_DEV_REFERENCES === "true" ||
    process.env.DEV_REFERENCES === "true" ||
    process.env.NODE_ENV === "development";

  if (!enabled) {
    notFound();
  }

  return <DevReferencesClient schema={DEMO_SCHEMA} dataset={DEMO_DATASET} />;
}
