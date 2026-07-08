"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Vendedor {
  id: string;
  name: string;
  email: string;
  active: boolean;
  inRotation: boolean;
  rotationOrder: number;
}

export function VendedoresView() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/vendedores");
    if (res.ok) {
      const data = await res.json();
      setVendedores(data.vendedores);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao cadastrar vendedor");
      }
      toast.success("Vendedor cadastrado");
      setName("");
      setEmail("");
      setPassword("");
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar vendedor");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(id: string, field: "active" | "inRotation", value: boolean) {
    const res = await fetch(`/api/vendedores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar vendedor");
      return;
    }
    refetch();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Vendedores</h1>
          <p className="text-sm text-muted-foreground">Fila de distribuição round-robin</p>
        </div>
        {!open && <Button onClick={() => setOpen(true)}>Novo vendedor</Button>}
      </div>

      {open && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cadastrar vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="v-name">Nome</Label>
                <Input id="v-name" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="v-email">E-mail</Label>
                <Input
                  id="v-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="v-password">Senha provisória</Label>
                <Input
                  id="v-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : "Cadastrar"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ordem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Na fila de distribuição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.rotationOrder}</TableCell>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.email}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={v.active ? "default" : "outline"}
                      onClick={() => toggle(v.id, "active", !v.active)}
                    >
                      {v.active ? "Ativo" : "Inativo"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={v.inRotation ? "default" : "outline"}
                      onClick={() => toggle(v.id, "inRotation", !v.inRotation)}
                    >
                      {v.inRotation ? "Recebendo leads" : "Fora da fila"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && vendedores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum vendedor cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
