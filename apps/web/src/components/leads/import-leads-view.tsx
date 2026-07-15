"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ImportResult {
  created: number;
  errors: string[];
}

export function ImportLeadsView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/leads/import", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Erro ao importar leads");
      }

      setResult(data);
      toast.success(`${data.created} lead(s) importado(s)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar leads");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/leads"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para leads
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Importar leads</h1>
        <p className="text-sm text-muted-foreground">
          Envie um relatório em CSV (colunas: nome, telefone/whatsapp, carro). Cada lead
          entra em triagem automática — recebe uma mensagem de WhatsApp e é distribuído
          pro vendedor da vez assim que a resposta for classificada como quente ou morno.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-sm">Arquivo CSV</CardTitle>
          <CardDescription>Exemplo: nome,telefone,carro</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              required
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
            />
            <Button type="submit" disabled={submitting} className="w-fit">
              {submitting ? "Importando..." : "Importar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>{result.created} lead(s) importado(s) com sucesso.</p>
            {result.errors.length > 0 && (
              <div>
                <p className="font-medium text-destructive">
                  {result.errors.length} linha(s) com problema:
                </p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {result.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
