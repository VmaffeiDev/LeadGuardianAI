"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RankingItem {
  vendedorId: string;
  name: string;
  totalLeads: number;
  ganhos: number;
  perdidos: number;
  conversionRate: number;
  avgFirstResponseMinutes: number | null;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export function RankingView() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [avgResponseMinutes, setAvgResponseMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setRanking(data.ranking);
        setAvgResponseMinutes(data.avgResponseMinutes);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Ranking de vendedores</h1>
        <p className="text-sm text-muted-foreground">
          Tempo médio de resposta do tenant: {formatMinutes(avgResponseMinutes)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Desempenho</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Ganhos</TableHead>
                <TableHead>Perdidos</TableHead>
                <TableHead>Conversão</TableHead>
                <TableHead>Tempo médio de resposta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((item, index) => (
                <TableRow key={item.vendedorId}>
                  <TableCell>
                    {index < 3 ? <Trophy className="h-4 w-4 text-warning" /> : index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.totalLeads}</TableCell>
                  <TableCell>{item.ganhos}</TableCell>
                  <TableCell>{item.perdidos}</TableCell>
                  <TableCell>{(item.conversionRate * 100).toFixed(0)}%</TableCell>
                  <TableCell>{formatMinutes(item.avgFirstResponseMinutes)}</TableCell>
                </TableRow>
              ))}
              {!loading && ranking.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
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
