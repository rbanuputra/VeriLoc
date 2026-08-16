'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Leave {
  id: string;
  type: 'CUTI' | 'IZIN' | 'SAKIT' | 'LEMBUR';
  start_date: string;
  end_date: string;
  reason: string;
  hours: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user?: { fullname: string };
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}

const STATUS_BADGE: Record<Leave['status'], 'warning' | 'success' | 'destructive'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

export default function LeavesPage() {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback((s: string) => {
    setLoading(true);
    const q = s ? `?status=${s}&limit=50` : '?limit=50';
    api<Paginated<Leave>>(`/leaves${q}`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      await api(`/leaves/${id}/${action}`, { method: 'PATCH', body: {} });
      load(status);
    } catch {
      // noop — biarkan tabel apa adanya
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuti & Lembur</h1>
          <p className="text-sm text-muted-foreground">
            Kelola pengajuan karyawan.
          </p>
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-44"
        >
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
          <option value="">Semua</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
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
                    Tidak ada pengajuan.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.user?.fullname ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{l.type}</Badge>
                      {l.type === 'LEMBUR' && l.hours && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          {Number(l.hours)} jam
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={l.reason}>
                      {l.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[l.status]}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === l.id}
                            onClick={() => review(l.id, 'approve')}
                          >
                            Setujui
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy === l.id}
                            onClick={() => review(l.id, 'reject')}
                          >
                            Tolak
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
