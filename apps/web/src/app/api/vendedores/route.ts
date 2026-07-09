import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import argon2 from "argon2";
import { Prisma, prisma, Role } from "@leadguardian/db";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";

const createVendedorSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function GET() {
  try {
    const session = await requireSession();
    requirePermission(session, "vendedor:manage");
    const db = scopedDb(session);

    const vendedores = await db.user.findMany({
      where: { role: Role.VENDEDOR },
      orderBy: { rotationOrder: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        inRotation: true,
        rotationOrder: true,
      },
    });

    return NextResponse.json({ vendedores });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session, "vendedor:manage");
    const db = scopedDb(session);

    const body = await req.json();
    const parsed = createVendedorSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Dados inválidos");

    // Email is globally unique (login is by e-mail alone), so the
    // availability check must look across every tenant, not just this one.
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) throw new ApiError(409, "Já existe um usuário com este e-mail");

    const maxOrder = await db.user.aggregate({
      where: { role: Role.VENDEDOR },
      _max: { rotationOrder: true },
    });

    const passwordHash = await argon2.hash(parsed.data.password);

    const vendedor = await db.user.create({
      data: {
        // tenantId is also auto-injected by the tenant-scope extension; passed
        // explicitly here too so this satisfies Prisma's required-field types.
        tenantId: session.user.tenantId,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: Role.VENDEDOR,
        rotationOrder: (maxOrder._max.rotationOrder ?? -1) + 1,
      },
      // Never return passwordHash to the client.
      select: { id: true, name: true, email: true, active: true, inRotation: true, rotationOrder: true },
    });

    return NextResponse.json({ vendedor }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return handleApiError(new ApiError(409, "Já existe um usuário com este e-mail"));
    }
    return handleApiError(err);
  }
}
