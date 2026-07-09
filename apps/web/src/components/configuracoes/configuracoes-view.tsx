"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ConfiguracoesView() {
  const [warningMinutes, setWarningMinutes] = useState(15);
  const [criticalMinutes, setCriticalMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tenant").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant?.alertThresholds;
        if (t) {
          setWarningMinutes(t.warningMinutes);
          setCriticalMinutes(t.criticalMinutes);
        }
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warningMinutes, criticalMinutes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar");
      }
      toast.success("Limites de alerta atualizados");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Limites de tempo sem resposta para alertas</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">Limites de alerta</CardTitle>
          <CardDescription>
            Definem quando um lead vira &quot;aviso&quot; e quando vira &quot;crítico&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="warning">Aviso (minutos sem resposta)</Label>
              <Input
                id="warning"
                type="number"
                min={1}
                required
                value={warningMinutes}
                onChange={(e) => setWarningMinutes(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="critical">Crítico (minutos sem resposta)</Label>
              <Input
                id="critical"
                type="number"
                min={1}
                required
                value={criticalMinutes}
                onChange={(e) => setCriticalMinutes(Number(e.target.value))}
              />
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
