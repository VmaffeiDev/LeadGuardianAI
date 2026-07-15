import { NextRequest, NextResponse } from "next/server";
import { LeadStatus, LeadEventType } from "@leadguardian/db";
import { normalizeWhatsappPhone } from "@leadguardian/core";
import { requireSession, requirePermission, scopedDb, handleApiError, ApiError } from "@/lib/api";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const NAME_HEADERS = ["nome", "name"];
const PHONE_HEADERS = ["telefone", "whatsapp", "celular", "phone"];
const CAR_HEADERS = ["carro", "veiculo", "modelo", "car"];

/**
 * Imports leads from a CSV report (nome, telefone/whatsapp, carro columns —
 * order and exact header names are flexible). Every imported lead starts in
 * EM_TRIAGEM: the worker's startPendingTriages job picks it up and sends the
 * WhatsApp template, no distribution happens until it's classified.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    requirePermission(session, "lead:create");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "Envie um arquivo CSV no campo 'file'");
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      throw new ApiError(400, "CSV vazio ou sem linhas de dados");
    }

    const header = parseCsvLine(lines[0]!).map(normalizeHeader);
    const nameIdx = header.findIndex((h) => NAME_HEADERS.includes(h));
    const phoneIdx = header.findIndex((h) => PHONE_HEADERS.includes(h));
    const carIdx = header.findIndex((h) => CAR_HEADERS.includes(h));

    if (nameIdx === -1 || phoneIdx === -1) {
      throw new ApiError(
        400,
        "CSV precisa ter colunas de nome e telefone/whatsapp (ex: nome,telefone,carro)",
      );
    }

    const db = scopedDb(session);
    let created = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]!);
      const name = row[nameIdx]?.trim();
      const rawPhone = row[phoneIdx]?.trim();
      const carInterest = carIdx >= 0 ? row[carIdx]?.trim() : undefined;

      if (!name) {
        errors.push(`Linha ${i + 1}: nome vazio`);
        continue;
      }

      const whatsapp = rawPhone ? normalizeWhatsappPhone(rawPhone) : null;
      if (!whatsapp) {
        errors.push(`Linha ${i + 1}: telefone inválido ("${rawPhone ?? ""}")`);
        continue;
      }

      const lead = await db.lead.create({
        data: {
          tenantId: session.user.tenantId,
          name,
          whatsapp,
          carInterest: carInterest || undefined,
          source: "Importação CSV",
          status: LeadStatus.EM_TRIAGEM,
          createdById: session.user.id,
        },
      });

      await db.leadEvent.create({
        data: {
          leadId: lead.id,
          authorId: session.user.id,
          type: LeadEventType.STATUS_CHANGE,
          message: "Lead importado, aguardando triagem via WhatsApp",
          payload: { to: LeadStatus.EM_TRIAGEM },
        },
      });

      created++;
    }

    return NextResponse.json({ created, errors }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
