import { PrismaClient, Role, LeadStatus, LeadEventType } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo@123";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "concessionaria-demo" },
    update: {},
    create: {
      name: "Concessionária Demo",
      slug: "concessionaria-demo",
      alertThresholds: { warningMinutes: 15, criticalMinutes: 30 },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Ana Admin",
      email: "admin@demo.com",
      passwordHash,
      role: Role.ADMIN,
      inRotation: false,
    },
  });

  const gestor = await prisma.user.upsert({
    where: { email: "gestor@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Gustavo Gestor",
      email: "gestor@demo.com",
      passwordHash,
      role: Role.GESTOR,
      inRotation: false,
    },
  });

  const tratador = await prisma.user.upsert({
    where: { email: "tratador@demo.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Tiago Tratador",
      email: "tratador@demo.com",
      passwordHash,
      role: Role.TRATADOR,
      inRotation: false,
    },
  });

  const vendedorNames = [
    "Vitor Vendedor",
    "Valentina Vendas",
    "Vinícius Ventas",
    "Vera Vendedora",
  ];

  const vendedores = [];
  for (const [i, name] of vendedorNames.entries()) {
    const email = `vendedor${i + 1}@demo.com`;
    const vendedor = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        tenantId: tenant.id,
        name,
        email,
        passwordHash,
        role: Role.VENDEDOR,
        inRotation: true,
        rotationOrder: i,
      },
    });
    vendedores.push(vendedor);
  }

  const lastVendedor = vendedores.at(-1);
  if (lastVendedor) {
    await prisma.distributionState.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: { tenantId: tenant.id, lastAssignedUserId: lastVendedor.id },
    });
  }

  // Leads at varied ages so the dashboard already shows some green, some
  // warning (>=15min idle) and some critical (>=30min idle) leads on first run.
  const leadSeeds: Array<{
    name: string;
    phone: string;
    source: string;
    status: LeadStatus;
    idleMinutes: number;
    vendedorIndex: number | null;
  }> = [
    { name: "Carlos Silva", phone: "11 91234-0001", source: "Site", status: LeadStatus.NOVO, idleMinutes: 2, vendedorIndex: 0 },
    { name: "Bruna Costa", phone: "11 91234-0002", source: "Instagram", status: LeadStatus.EM_ATENDIMENTO, idleMinutes: 8, vendedorIndex: 1 },
    { name: "Diego Almeida", phone: "11 91234-0003", source: "Indicação", status: LeadStatus.EM_ATENDIMENTO, idleMinutes: 18, vendedorIndex: 2 },
    { name: "Fernanda Lima", phone: "11 91234-0004", source: "Site", status: LeadStatus.EM_NEGOCIACAO, idleMinutes: 35, vendedorIndex: 3 },
    { name: "Marcelo Souza", phone: "11 91234-0005", source: "Facebook Ads", status: LeadStatus.EM_ATENDIMENTO, idleMinutes: 45, vendedorIndex: 0 },
    { name: "Patricia Rocha", phone: "11 91234-0006", source: "Loja física", status: LeadStatus.NOVO, idleMinutes: 1, vendedorIndex: 1 },
    { name: "Rafael Gomes", phone: "11 91234-0007", source: "Site", status: LeadStatus.GANHO, idleMinutes: 120, vendedorIndex: 2 },
    { name: "Simone Dias", phone: "11 91234-0008", source: "Indicação", status: LeadStatus.PERDIDO, idleMinutes: 200, vendedorIndex: 3 },
    { name: "Thiago Nunes", phone: "11 91234-0009", source: "Instagram", status: LeadStatus.EM_NEGOCIACAO, idleMinutes: 22, vendedorIndex: 0 },
    { name: "Aline Ferreira", phone: "11 91234-0010", source: "Site", status: LeadStatus.EM_ATENDIMENTO, idleMinutes: 5, vendedorIndex: 1 },
    { name: "Eduardo Martins", phone: "11 91234-0011", source: "Facebook Ads", status: LeadStatus.EM_ATENDIMENTO, idleMinutes: 60, vendedorIndex: 2 },
    { name: "Juliana Barros", phone: "11 91234-0012", source: "Site", status: LeadStatus.NOVO, idleMinutes: 0, vendedorIndex: null },
  ];

  for (const seed of leadSeeds) {
    const vendedor = seed.vendedorIndex === null ? null : vendedores[seed.vendedorIndex];
    const lastInteractionAt = minutesAgo(seed.idleMinutes);

    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        name: seed.name,
        phone: seed.phone,
        source: seed.source,
        status: seed.status,
        createdById: tratador.id,
        assignedToId: vendedor?.id ?? null,
        assignedAt: vendedor ? lastInteractionAt : null,
        lastInteractionAt,
      },
    });

    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        authorId: tratador.id,
        type: LeadEventType.STATUS_CHANGE,
        message: "Lead cadastrado",
        payload: { to: LeadStatus.NOVO },
      },
    });

    if (vendedor) {
      await prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          authorId: null,
          type: LeadEventType.ASSIGNMENT,
          message: `Distribuído automaticamente para ${vendedor.name}`,
          payload: { assignedToId: vendedor.id },
        },
      });
    }
  }

  console.log("Seed concluído.");
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`Senha padrão de todos os usuários de teste: ${DEMO_PASSWORD}`);
  console.log(
    [admin, gestor, tratador, ...vendedores]
      .map((u) => `  - ${u.role.padEnd(9)} ${u.email}`)
      .join("\n"),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
