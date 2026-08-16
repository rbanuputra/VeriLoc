'use client';

import { useEffect, useState } from 'react';
import { Users, Fingerprint, CalendarClock, Building2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PlatformDashboard() {
  const [stats, setStats] = useState({ orgs: '—', supers: '—' });
  useEffect(() => {
    Promise.allSettled([
      api<unknown[]>('/organizations'),
      api<unknown[]>('/organizations/platform/super-admins'),
    ]).then(([o, s]) => {
      setStats({
        orgs: o.status === 'fulfilled' ? String(o.value.length) : '0',
        supers: s.status === 'fulfilled' ? String(s.value.length) : '0',
      });
    });
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform Console</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan platform GeoFace (tim developer).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Perusahaan" value={stats.orgs} icon={Building2} />
        <StatCard label="Super Admin" value={stats.supers} icon={ShieldCheck} />
      </div>
    </div>
  );
}

function TenantDashboard() {
  const [stats, setStats] = useState({ users: '—', attendance: '—', pending: '—' });
  useEffect(() => {
    Promise.allSettled([
      api<{ meta?: { total: number } }>('/user?limit=1'),
      api<{ meta?: { total: number } }>('/attendance?limit=1'),
      api<{ meta?: { total: number } }>('/leaves?status=PENDING&limit=1'),
    ]).then(([u, a, l]) => {
      setStats({
        users: u.status === 'fulfilled' ? String(u.value.meta?.total ?? 0) : '0',
        attendance: a.status === 'fulfilled' ? String(a.value.meta?.total ?? 0) : '0',
        pending: l.status === 'fulfilled' ? String(l.value.meta?.total ?? 0) : '0',
      });
    });
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan aktivitas perusahaan.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Karyawan" value={stats.users} icon={Users} />
        <StatCard label="Total Absensi" value={stats.attendance} icon={Fingerprint} />
        <StatCard label="Cuti Menunggu" value={stats.pending} icon={CalendarClock} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return user?.role === 'SuperAdmin' ? <PlatformDashboard /> : <TenantDashboard />;
}
