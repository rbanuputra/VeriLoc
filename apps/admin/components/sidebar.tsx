'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Fingerprint,
  MapPin,
  CalendarClock,
  Wallet,
  FileText,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: React.ElementType };

// Menu untuk Admin/HRD/Manager dalam sebuah tenant.
const NAV_TENANT: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Karyawan', icon: Users },
  { href: '/attendance', label: 'Absensi', icon: Fingerprint },
  { href: '/leaves', label: 'Cuti & Lembur', icon: CalendarClock },
  { href: '/payroll', label: 'Payroll', icon: Wallet },
  { href: '/onboarding', label: 'Onboarding', icon: FileText },
  { href: '/offices', label: 'Kantor', icon: MapPin },
];

// Menu untuk SuperAdmin (tim GeoFace) — level platform, lintas tenant.
const NAV_PLATFORM: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organizations', label: 'Perusahaan', icon: Building2 },
  { href: '/super-admins', label: 'Super Admin', icon: ShieldCheck },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const isPlatform = role === 'SuperAdmin';
  const nav = isPlatform ? NAV_PLATFORM : NAV_TENANT;

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          G
        </div>
        <div className="leading-tight">
          <div className="font-semibold">GeoFace</div>
          <div className="text-[11px] text-muted-foreground">
            {isPlatform ? 'Platform Console' : 'Admin Panel'}
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
