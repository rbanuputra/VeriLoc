'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationPicker } from '@/components/location-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Office {
  id: string;
  name: string;
  address?: string;
  latitude: string;
  longitude: string;
  radius_meters: number;
  is_active: boolean;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number };
}

const EMPTY = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radius_meters: '150',
};

export default function OfficesPage() {
  const [rows, setRows] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api<Paginated<Office>>('/office?limit=100')
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api('/office', {
        method: 'POST',
        body: {
          name: form.name,
          address: form.address || undefined,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          radius_meters: Number(form.radius_meters),
        },
      });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kantor</h1>
          <p className="text-sm text-muted-foreground">
            Titik geofence untuk absensi ({rows.length}).
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Tambah Kantor
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Tambah Kantor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nama Kantor</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Kantor Pusat"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alamat (opsional)</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Jl. ..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lokasi Kantor</Label>
                <LocationPicker
                  radius={Number(form.radius_meters) || 150}
                  onChange={({ lat, lng }) =>
                    setForm((f) => ({
                      ...f,
                      latitude: String(lat),
                      longitude: String(lng),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Radius Absensi</Label>
                  <span className="text-sm font-semibold text-primary">
                    {form.radius_meters} m
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={1000}
                  step={10}
                  value={form.radius_meters}
                  onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Karyawan hanya bisa absen dalam radius ini dari titik kantor.
                </p>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan Kantor'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Koordinat</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Belum ada kantor.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.name}
                      {o.address && (
                        <div className="text-xs text-muted-foreground">{o.address}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(o.latitude).toFixed(5)}, {Number(o.longitude).toFixed(5)}
                    </TableCell>
                    <TableCell>{o.radius_meters} m</TableCell>
                    <TableCell>
                      {o.is_active ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : (
                        <Badge variant="muted">Nonaktif</Badge>
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
