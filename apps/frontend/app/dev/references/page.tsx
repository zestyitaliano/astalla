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

export default function DevReferencesPage() {
  const enabled =
    process.env.NEXT_PUBLIC_DEV_REFERENCES === "true" ||
    process.env.DEV_REFERENCES === "true" ||
    process.env.NODE_ENV === "development";

  if (!enabled) {
    notFound();
  }

  return <DevReferencesClient schema={DEMO_SCHEMA} />;
}
