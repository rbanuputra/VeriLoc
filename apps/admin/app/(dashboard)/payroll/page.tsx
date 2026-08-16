'use client';

import { useCallback, useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { api } from '@/lib/api';
import { formatIDR } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Payslip {
  id: string;
  net: string;
  gross: string;
  total_earning: string;
  total_deduction: string;
  bpjs_employee: string;
  pph21: string;
  user?: { fullname: string };
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback((p: string) => {
    setLoading(true);
    api<Paginated<Payslip>>(`/payroll?period=${p}&limit=100`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    setRunning(true);
    setMsg(null);
    try {
      const res = await api<unknown[]>('/payroll/run', {
        method: 'POST',
        body: { period },
      });
      setMsg(`Payroll dihitung: ${res.length} slip gaji.`);
      load(period);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Gagal menjalankan payroll');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        <p className="text-sm text-muted-foreground">
          Hitung gaji karyawan (otomatis dari absensi, lembur, BPJS & PPh21).
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <Label>Periode</Label>
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-44"
            />
          </div>
          <Button variant="outline" onClick={() => load(period)} disabled={loading}>
            Lihat Slip
          </Button>
          <Button onClick={run} disabled={running}>
            <Play className="h-4 w-4" />
            {running ? 'Menghitung…' : 'Jalankan Payroll'}
          </Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">BPJS</TableHead>
                <TableHead className="text-right">PPh21</TableHead>
                <TableHead className="text-right">Gaji Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada slip gaji periode ini. Klik “Jalankan Payroll”.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.user?.fullname ?? '-'}</TableCell>
                    <TableCell className="text-right">{formatIDR(p.total_earning)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatIDR(p.total_deduction)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatIDR(p.bpjs_employee)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatIDR(p.pph21)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatIDR(p.net)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
