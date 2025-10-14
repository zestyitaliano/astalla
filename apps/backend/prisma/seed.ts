import { ColumnType, PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@astalla.com";
const ADMIN_PASSWORD = "Astalla2025!";

async function main() {
  const email = ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const bcryptRounds = bcrypt.getRounds(passwordHash);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: UserRole.ORG_ADMIN
    },
    update: {
      passwordHash,
      role: UserRole.ORG_ADMIN
    }
  });

  const isPasswordValid = await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash);

  console.log(
    `Seeded admin user: ${user.email} (${existing ? "updated" : "created"}). bcryptRounds=${bcryptRounds}. passwordValid=${isPasswordValid}`
  );

  let org = await prisma.org.findFirst();

  if (!org) {
    org = await prisma.org.create({
      data: {
        name: "Astalla Demo Org"
      }
    });
    console.log(`Created demo org: ${org.name}`);
  }

  if (!user.orgId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { orgId: org.id }
    });
  }

  const tableCount = await prisma.dataTable.count();

  if (tableCount === 0) {
    const table = await prisma.dataTable.create({
      data: {
        orgId: org.id,
        name: "Portfolio",
        description: "Sample portfolio metrics",
        createdBy: user.id
      }
    });

    const columnDefinitions = [
      { name: "Property", type: ColumnType.TEXT },
      { name: "Units", type: ColumnType.NUMBER },
      { name: "OccupancyPct", type: ColumnType.NUMBER },
      { name: "Rent", type: ColumnType.NUMBER },
      { name: "Date", type: ColumnType.DATE }
    ];

    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-") || "column";

    const columns = await Promise.all(
      columnDefinitions.map((definition, index) =>
        prisma.tableColumn.create({
          data: {
            tableId: table.id,
            name: definition.name,
            slug: slugify(definition.name),
            type: definition.type,
            position: index + 1
          }
        })
      )
    );

    const columnMap = new Map(columns.map((column) => [column.name, column] as const));

    const sampleRows = [
      {
        Property: "Sunset Villas",
        Units: 120,
        OccupancyPct: 0.96,
        Rent: 1525,
        Date: "2024-01-15"
      },
      {
        Property: "Harbor Heights",
        Units: 98,
        OccupancyPct: 0.91,
        Rent: 1680,
        Date: "2024-02-10"
      },
      {
        Property: "Cedar Grove",
        Units: 140,
        OccupancyPct: 0.88,
        Rent: 1395,
        Date: "2024-03-05"
      },
      {
        Property: "Willow Creek",
        Units: 110,
        OccupancyPct: 0.94,
        Rent: 1740,
        Date: "2024-04-12"
      },
      {
        Property: "Riverstone Flats",
        Units: 156,
        OccupancyPct: 0.92,
        Rent: 1655,
        Date: "2024-05-18"
      },
      {
        Property: "Maple Square",
        Units: 132,
        OccupancyPct: 0.89,
        Rent: 1480,
        Date: "2024-06-22"
      },
      {
        Property: "Oakridge Estates",
        Units: 124,
        OccupancyPct: 0.95,
        Rent: 1820,
        Date: "2024-07-02"
      },
      {
        Property: "Laguna Point",
        Units: 90,
        OccupancyPct: 0.93,
        Rent: 2010,
        Date: "2024-08-11"
      },
      {
        Property: "Pineview Terrace",
        Units: 108,
        OccupancyPct: 0.87,
        Rent: 1425,
        Date: "2024-09-06"
      },
      {
        Property: "Summit Ridge",
        Units: 118,
        OccupancyPct: 0.97,
        Rent: 1905,
        Date: "2024-10-01"
      }
    ];

    for (let index = 0; index < sampleRows.length; index += 1) {
      const data = sampleRows[index];
      const row = await prisma.tableRow.create({
        data: {
          tableId: table.id,
          position: index + 1,
          createdBy: user.id
        }
      });

      const cells = Object.entries(data)
        .map(([key, rawValue]) => {
          const column = columnMap.get(key);
          if (!column) {
            return undefined;
          }

          let value: unknown;
          switch (column.type) {
            case ColumnType.NUMBER:
              value = Number(rawValue);
              break;
            case ColumnType.DATE:
              value = new Date(String(rawValue)).toISOString();
              break;
            default:
              value = rawValue as string;
          }

          return {
            rowId: row.id,
            columnId: column.id,
            value
          };
        })
        .filter((entry): entry is { rowId: string; columnId: string; value: unknown } => Boolean(entry));

      if (cells.length) {
        await prisma.tableCell.createMany({ data: cells });
      }
    }

    await prisma.tableView.create({
      data: {
        tableId: table.id,
        name: "Current Portfolio",
        config: {
          columnOrder: columns.map((column) => column.id)
        },
        createdBy: user.id
      }
    });

    console.log(`Created demo table with ${columns.length} columns and ${sampleRows.length} rows.`);
  }
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
