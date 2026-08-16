'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Attendance {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  distance_meters: number;
  face_distance: number;
  liveness_score: number | null;
  created_at: string;
  user?: { fullname: string };
  office?: { name: string };
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; totalPages: number };
}

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    api<Paginated<Attendance>>(`/attendance?page=${p}&limit=10`)
      .then((r) => {
        setRows(r.data);
        setMeta({ total: r.meta.total, totalPages: r.meta.totalPages });
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Absensi</h1>
        <p className="text-sm text-muted-foreground">
          {meta.total} catatan absensi.
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kantor</TableHead>
                <TableHead>Jarak</TableHead>
                <TableHead>Wajah / Liveness</TableHead>
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
                    Belum ada absensi.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(a.created_at).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {a.user?.fullname ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.type === 'CHECK_IN' ? 'success' : 'muted'}>
                        {a.type === 'CHECK_IN' ? 'Masuk' : 'Pulang'}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.office?.name ?? '-'}</TableCell>
                    <TableCell>{Math.round(a.distance_meters)} m</TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(a.face_distance).toFixed(3)}
                      {a.liveness_score != null &&
                        ` / ${Number(a.liveness_score).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Halaman {page} dari {meta.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
