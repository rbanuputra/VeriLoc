'use client';

import * as React from 'react';
import {
  Rocket,
  MapPin,
  FileText,
  Users,
  Fingerprint,
  CalendarClock,
  Wallet,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  icon: React.ElementType;
  kicker: string;
  title: string;
  body: string;
  tip?: string;
}

const TENANT_STEPS: Step[] = [
  {
    icon: Rocket,
    kicker: 'Selamat datang',
    title: 'Halo, selamat datang di GeoFace 👋',
    body: 'Kelola absensi, cuti, dan gaji karyawan dari satu tempat. Kami temani 30 detik untuk menyiapkan semuanya — sekali saja.',
  },
  {
    icon: MapPin,
    kicker: 'Langkah 1 — Setup',
    title: 'Tandai lokasi kantormu',
    body: 'Daftarkan titik kantor dan radiusnya (misalnya 150 m). Karyawan hanya bisa absen ketika benar-benar berada di area kantor — divalidasi lewat GPS presisi (PostGIS).',
    tip: 'Kantor → Tambah Kantor',
  },
  {
    icon: FileText,
    kicker: 'Langkah 2 — Setup',
    title: 'Rekrut karyawan cukup dari kontraknya',
    body: 'Unggah dokumen kontrak, biar sistem yang membaca (OCR) gaji pokok, tunjangan, dan potongannya. Kamu tinggal cek → akun karyawan + kontrak langsung jadi, plus password sementara.',
    tip: 'Onboarding → Upload & Scan',
  },
  {
    icon: Users,
    kicker: 'Kenali menu',
    title: 'Karyawan',
    body: 'Daftar seluruh timmu. Mereka login lewat aplikasi karyawan, daftarkan wajah sekali, lalu siap absen setiap hari.',
    tip: 'Menu Karyawan',
  },
  {
    icon: Fingerprint,
    kicker: 'Kenali menu',
    title: 'Absensi anti-titip',
    body: 'Tiap absen lolos tiga lapis: berada di radius kantor, wajah cocok (face recognition), dan bukan foto/video (liveness). Titip absen? Nggak bisa.',
    tip: 'Menu Absensi',
  },
  {
    icon: CalendarClock,
    kicker: 'Kenali menu',
    title: 'Cuti & lembur, sekali klik',
    body: 'Pengajuan cuti, izin, sakit, dan lembur masuk ke sini. Setujui atau tolak langsung — lembur yang disetujui otomatis ikut terhitung di gaji.',
    tip: 'Menu Cuti & Lembur',
  },
  {
    icon: Wallet,
    kicker: 'Kenali menu',
    title: 'Payroll yang menghitung sendiri',
    body: 'Pilih periode, tekan Jalankan. Gaji terhitung otomatis dari kehadiran + lembur, lengkap dengan BPJS dan PPh21 metode TER terbaru.',
    tip: 'Payroll → Jalankan Payroll',
  },
  {
    icon: CheckCircle2,
    kicker: 'Kamu siap',
    title: 'Semua siap dijalankan 🎉',
    body: 'Alur idealnya: Kantor → rekrut karyawan → pantau Absensi → kelola Cuti → jalankan Payroll. Ingin membuka panduan ini lagi? Ada ikon “?” di kanan atas.',
  },
];

const PLATFORM_STEPS: Step[] = [
  {
    icon: Rocket,
    kicker: 'Selamat datang',
    title: 'Halo tim GeoFace 👋',
    body: 'Ini konsol platform untuk mengelola seluruh perusahaan (tenant) yang memakai GeoFace.',
  },
  {
    icon: Building2,
    kicker: 'Kenali menu',
    title: 'Semua perusahaan dalam satu layar',
    body: 'Pantau setiap tenant yang terdaftar. Data tiap perusahaan terisolasi penuh — tidak saling bocor.',
    tip: 'Menu Perusahaan',
  },
  {
    icon: ShieldCheck,
    kicker: 'Kenali menu',
    title: 'Kelola akses tim internal',
    body: 'Tambah atau lihat akun Super Admin untuk anggota tim developer di sini.',
    tip: 'Super Admin → Tambah',
  },
  {
    icon: CheckCircle2,
    kicker: 'Kamu siap',
    title: 'Selamat menjelajah 🎉',
    body: 'Butuh membuka panduan ini lagi? Klik ikon “?” di kanan atas kapan saja.',
  },
];

export function OnboardingTour({
  role,
  onClose,
}: {
  role: string;
  onClose: () => void;
}) {
  const steps = role === 'SuperAdmin' ? PLATFORM_STEPS : TENANT_STEPS;
  const [i, setI] = React.useState(0);
  const step = steps[i];
  const Icon = step.icon;
  const isLast = i === steps.length - 1;
  const isFirst = i === 0;
  const progress = ((i + 1) / steps.length) * 100;

  const next = () => (isLast ? onClose() : setI((v) => v + 1));
  const prev = () => setI((v) => Math.max(0, v - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-gf-fade">
      <div className="grid w-full max-w-[720px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-gf-pop md:grid-cols-[300px_1fr]">
        {/* Panel kiri — visual & progres */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-7 text-white md:flex"
          style={{
            backgroundImage:
              'linear-gradient(150deg, hsl(221 83% 53%), hsl(248 74% 55%) 55%, hsl(270 70% 45%))',
          }}
        >
          {/* blob dekoratif */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-black/10 blur-2xl" />

          <div className="relative flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 font-bold backdrop-blur">
              G
            </div>
            <span className="font-semibold tracking-tight">GeoFace</span>
          </div>

          <div className="relative flex flex-1 items-center justify-center py-8">
            <div
              key={i}
              className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-md animate-gf-float"
            >
              <Icon className="h-11 w-11" strokeWidth={1.6} />
            </div>
          </div>

          <div className="relative space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>{step.kicker}</span>
              <span>
                {i + 1} / {steps.length}
              </span>
            </div>
          </div>
        </div>

        {/* Panel kanan — konten */}
        <div className="relative flex flex-col p-7 sm:p-8">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>

          <div key={i} className="flex flex-1 flex-col animate-gf-step">
            <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary md:hidden">
              <Sparkles className="h-3.5 w-3.5" />
              {step.kicker}
            </span>
            <h2 className="mt-1 text-2xl font-bold leading-tight tracking-tight md:mt-6">
              {step.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>

            {step.tip && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Buka </span>
                  <span className="font-semibold text-foreground">{step.tip}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <button
              onClick={onClose}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Lewati
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
              )}
              <button
                onClick={next}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow"
              >
                {isLast ? 'Mulai Sekarang' : 'Lanjut'}
                {isLast ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
