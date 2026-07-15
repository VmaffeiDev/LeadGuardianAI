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
  const [savingThresholds, setSavingThresholds] = useState(false);

  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [whatsappTemplateName, setWhatsappTemplateName] = useState("");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tenant").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant?.alertThresholds;
        if (t) {
          setWarningMinutes(t.warningMinutes);
          setCriticalMinutes(t.criticalMinutes);
        }
        setWhatsappPhoneNumberId(data.tenant?.whatsappPhoneNumberId ?? "");
        setWhatsappTemplateName(data.tenant?.whatsappTemplateName ?? "");
      }
      setLoading(false);
    });
  }, []);

  async function handleThresholdsSubmit(event: FormEvent) {
    event.preventDefault();
    setSavingThresholds(true);
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
      setSavingThresholds(false);
    }
  }

  async function handleWhatsappSubmit(event: FormEvent) {
    event.preventDefault();
    setSavingWhatsapp(true);
    try {
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhoneNumberId, whatsappTemplateName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao salvar");
      }
      toast.success("Configuração de WhatsApp atualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingWhatsapp(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Alertas e triagem automática via WhatsApp</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">Limites de alerta</CardTitle>
          <CardDescription>
            Definem quando um lead vira &quot;aviso&quot; e quando vira &quot;crítico&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleThresholdsSubmit} className="flex flex-col gap-4">
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
            <Button type="submit" disabled={savingThresholds} className="w-fit">
              {savingThresholds ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-sm">Triagem automática via WhatsApp</CardTitle>
          <CardDescription>
            Necessário pra importar leads em CSV: identifica de qual número os leads
            importados recebem contato, e qual template aprovado no Meta Business Manager
            usar na primeira mensagem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleWhatsappSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phoneNumberId">Phone Number ID (Meta Cloud API)</Label>
              <Input
                id="phoneNumberId"
                value={whatsappPhoneNumberId}
                onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                placeholder="123456789012345"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="templateName">Nome do template aprovado</Label>
              <Input
                id="templateName"
                value={whatsappTemplateName}
                onChange={(e) => setWhatsappTemplateName(e.target.value)}
                placeholder="primeiro_contato_lead"
              />
            </div>
            <Button type="submit" disabled={savingWhatsapp} className="w-fit">
              {savingWhatsapp ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
