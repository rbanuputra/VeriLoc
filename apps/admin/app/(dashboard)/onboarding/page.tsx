'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Role {
  id: string;
  name: string;
}
interface Component {
  kind: 'EARNING' | 'DEDUCTION';
  name: string;
  calc: 'FIXED' | 'PERCENT';
  value: number;
  taxable: boolean;
}
interface Draft {
  base_salary: number | null;
  overtime_rate_per_hour: number | null;
  ptkp_status: string | null;
  standard_working_days: number | null;
  components: Component[];
  terms: string;
  notes: string[];
  employee: { fullname: string; email: string; role_id: string };
}
interface Doc {
  id: string;
  original_name: string;
  status: 'SCANNED' | 'CONFIRMED';
  created_at: string;
  extracted_data: Draft;
}

export default function OnboardingPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [up, setUp] = useState({ fullname: '', email: '', role_id: '' });

  // Form konfirmasi (pre-filled dari draft, bisa dikoreksi HRD)
  const [c, setC] = useState({
    fullname: '',
    email: '',
    role_id: '',
    base_salary: '',
    start_date: '',
    ptkp_status: 'TK/0',
    overtime_rate_per_hour: '',
    standard_working_days: '22',
    terms: '',
    components: [] as Component[],
  });

  const loadDocs = useCallback(() => {
    api<Doc[]>('/onboarding/contracts').then(setDocs).catch(() => setDocs([]));
  }, []);

  useEffect(() => {
    api<{ data?: Role[] } | Role[]>('/role')
      .then((r) => setRoles(Array.isArray(r) ? r : (r.data ?? [])))
      .catch(() => setRoles([]));
    loadDocs();
  }, [loadDocs]);

  const employeeRoles = roles.filter((r) => r.name !== 'SuperAdmin');

  function selectDoc(doc: Doc) {
    setSelected(doc);
    setTempPassword(null);
    const d = doc.extracted_data;
    setC({
      fullname: d.employee.fullname,
      email: d.employee.email,
      role_id: d.employee.role_id,
      base_salary: d.base_salary != null ? String(d.base_salary) : '',
      start_date: new Date().toISOString().slice(0, 10),
      ptkp_status: d.ptkp_status ?? 'TK/0',
      overtime_rate_per_hour:
        d.overtime_rate_per_hour != null ? String(d.overtime_rate_per_hour) : '',
      standard_working_days:
        d.standard_working_days != null ? String(d.standard_working_days) : '22',
      terms: d.terms ?? '',
      components: d.components ?? [],
    });
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Pilih file kontrak dulu');
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fullname', up.fullname);
      fd.append('email', up.email);
      fd.append('role_id', up.role_id);
      const doc = await api<Doc>('/onboarding/contracts/upload', { method: 'POST', form: fd });
      loadDocs();
      selectDoc(doc);
      setUp({ fullname: '', email: '', role_id: '' });
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setBusy(false);
    }
  }

  function setComp(i: number, patch: Partial<Component>) {
    setC((s) => ({
      ...s,
      components: s.components.map((x, idx) => (idx === i ? { ...x, ...patch } : x)),
    }));
  }
  function addComp() {
    setC((s) => ({
      ...s,
      components: [
        ...s.components,
        { kind: 'EARNING', name: '', calc: 'FIXED', value: 0, taxable: true },
      ],
    }));
  }
  function removeComp(i: number) {
    setC((s) => ({ ...s, components: s.components.filter((_, idx) => idx !== i) }));
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ temp_password: string }>(
        `/onboarding/contracts/${selected.id}/confirm`,
        {
          method: 'POST',
          body: {
            fullname: c.fullname,
            email: c.email,
            role_id: c.role_id,
            base_salary: Number(c.base_salary),
            start_date: c.start_date,
            ptkp_status: c.ptkp_status,
            overtime_rate_per_hour: c.overtime_rate_per_hour
              ? Number(c.overtime_rate_per_hour)
              : undefined,
            standard_working_days: Number(c.standard_working_days),
            terms: c.terms || undefined,
            components: c.components,
          },
        },
      );
      setTempPassword(res.temp_password);
      setSelected(null);
      loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konfirmasi gagal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding Karyawan</h1>
        <p className="text-sm text-muted-foreground">
          Upload kontrak → sistem scan → review → buat akun + kontrak.
        </p>
      </div>

      {tempPassword && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="pt-6">
            <p className="text-sm">
              Akun karyawan dibuat. Password sementara:{' '}
              <code className="rounded bg-muted px-2 py-1 font-mono">{tempPassword}</code>{' '}
              — serahkan ke karyawan (wajib diganti saat login pertama).
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>1. Upload Dokumen Kontrak</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onUpload} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>File kontrak (PDF / gambar)</Label>
              <Input ref={fileRef} type="file" accept=".pdf,image/*" required />
            </div>
            <div className="space-y-2">
              <Label>Nama Karyawan</Label>
              <Input
                value={up.fullname}
                onChange={(e) => setUp({ ...up, fullname: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={up.email}
                onChange={(e) => setUp({ ...up, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={up.role_id}
                onChange={(e) => setUp({ ...up, role_id: e.target.value })}
                required
              >
                <option value="">Pilih role…</option>
                {employeeRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                <Upload className="h-4 w-4" />
                {busy ? 'Memproses…' : 'Upload & Scan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Review + Confirm */}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>2. Review Hasil Scan & Konfirmasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected.extracted_data.notes?.length > 0 && (
              <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                {selected.extracted_data.notes.join(' · ')}
              </div>
            )}
            <form onSubmit={onConfirm} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input value={c.fullname} onChange={(e) => setC({ ...c, fullname: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={c.role_id} onChange={(e) => setC({ ...c, role_id: e.target.value })} required>
                    <option value="">Pilih role…</option>
                    {employeeRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gaji Pokok</Label>
                  <Input type="number" value={c.base_salary} onChange={(e) => setC({ ...c, base_salary: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Tarif Lembur / jam</Label>
                  <Input type="number" value={c.overtime_rate_per_hour} onChange={(e) => setC({ ...c, overtime_rate_per_hour: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status PTKP</Label>
                  <Select value={c.ptkp_status} onChange={(e) => setC({ ...c, ptkp_status: e.target.value })}>
                    {['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mulai Kontrak</Label>
                  <Input type="date" value={c.start_date} onChange={(e) => setC({ ...c, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Hari Kerja / bulan</Label>
                  <Input type="number" value={c.standard_working_days} onChange={(e) => setC({ ...c, standard_working_days: e.target.value })} />
                </div>
              </div>

              {/* Komponen */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tunjangan & Potongan</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addComp}>
                    <Plus className="h-4 w-4" /> Tambah
                  </Button>
                </div>
                {c.components.map((comp, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-2">
                    <Select className="col-span-3" value={comp.kind} onChange={(e) => setComp(i, { kind: e.target.value as Component['kind'] })}>
                      <option value="EARNING">Pendapatan</option>
                      <option value="DEDUCTION">Potongan</option>
                    </Select>
                    <Input className="col-span-4" placeholder="Nama" value={comp.name} onChange={(e) => setComp(i, { name: e.target.value })} />
                    <Select className="col-span-2" value={comp.calc} onChange={(e) => setComp(i, { calc: e.target.value as Component['calc'] })}>
                      <option value="FIXED">Rp</option>
                      <option value="PERCENT">%</option>
                    </Select>
                    <Input className="col-span-2" type="number" value={comp.value} onChange={(e) => setComp(i, { value: Number(e.target.value) })} />
                    <Button type="button" size="icon" variant="ghost" className="col-span-1" onClick={() => removeComp(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Syarat & Ketentuan (T&C)</Label>
                <Textarea value={c.terms} onChange={(e) => setC({ ...c, terms: e.target.value })} rows={4} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Menyimpan…' : 'Konfirmasi & Buat Akun'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Riwayat dokumen */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Belum ada dokumen.</p>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{d.original_name}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(d.created_at)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={d.status === 'CONFIRMED' ? 'success' : 'warning'}>
                    {d.status === 'CONFIRMED' ? 'Selesai' : 'Perlu Review'}
                  </Badge>
                  {d.status === 'SCANNED' && (
                    <Button size="sm" variant="outline" onClick={() => selectDoc(d)}>
                      Review
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
