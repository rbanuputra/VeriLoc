'use client';

import * as React from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LMap, Marker as LMarker, Circle as LCircle } from 'leaflet';
import { Crosshair, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PIN_SVG = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 22s7-6.7 7-12A7 7 0 0 0 5 10c0 5.3 7 12 7 12Z" fill="#2563eb" stroke="white" stroke-width="1.6"/>
  <circle cx="12" cy="10" r="2.6" fill="white"/></svg>`;

const DEFAULT = { lat: -6.2, lng: 106.816666 }; // Jakarta

interface Props {
  radius: number;
  initialLat?: number;
  initialLng?: number;
  onChange: (p: { lat: number; lng: number }) => void;
}

export function LocationPicker({ radius, initialLat, initialLng, onChange }: Props) {
  const elRef = React.useRef<HTMLDivElement>(null);
  const map = React.useRef<LMap | null>(null);
  const marker = React.useRef<LMarker | null>(null);
  const circle = React.useRef<LCircle | null>(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);
  const [coord, setCoord] = React.useState({
    lat: initialLat ?? DEFAULT.lat,
    lng: initialLng ?? DEFAULT.lng,
  });

  // Init peta (sekali).
  React.useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (disposed || !elRef.current || map.current) return;

      const start: [number, number] = [
        initialLat ?? DEFAULT.lat,
        initialLng ?? DEFAULT.lng,
      ];
      const m = L.map(elRef.current).setView(start, 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(m);

      const icon = L.divIcon({
        html: PIN_SVG,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      const mk = L.marker(start, { draggable: true, icon }).addTo(m);
      const cr = L.circle(start, {
        radius,
        color: '#2563eb',
        weight: 1.5,
        fillColor: '#2563eb',
        fillOpacity: 0.12,
      }).addTo(m);

      const commit = (lat: number, lng: number) => {
        mk.setLatLng([lat, lng]);
        cr.setLatLng([lat, lng]);
        setCoord({ lat, lng });
        onChangeRef.current({ lat, lng });
      };
      mk.on('dragend', () => {
        const p = mk.getLatLng();
        commit(p.lat, p.lng);
      });
      m.on('click', (e: any) => commit(e.latlng.lat, e.latlng.lng));

      map.current = m;
      marker.current = mk;
      circle.current = cr;
      setTimeout(() => m.invalidateSize(), 50);
      // set nilai awal ke form
      onChangeRef.current({ lat: start[0], lng: start[1] });
    })();

    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update lingkaran saat radius berubah.
  React.useEffect(() => {
    circle.current?.setRadius(radius);
  }, [radius]);

  function moveTo(lat: number, lng: number, zoom = 17) {
    marker.current?.setLatLng([lat, lng]);
    circle.current?.setLatLng([lat, lng]);
    map.current?.setView([lat, lng], zoom);
    setCoord({ lat, lng });
    onChangeRef.current({ lat, lng });
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query,
        )}`,
        { headers: { 'Accept-Language': 'id' } },
      );
      const data = await res.json();
      if (data[0]) moveTo(Number(data[0].lat), Number(data[0].lon));
    } catch {
      /* abaikan */
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        moveTo(pos.coords.latitude, pos.coords.longitude, 18);
        setSearching(false);
      },
      () => setSearching(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={search} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari alamat / nama tempat…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cari'}
          </Button>
        </form>
        <Button type="button" variant="outline" onClick={useMyLocation} disabled={searching}>
          <Crosshair className="h-4 w-4" />
          Lokasi saya
        </Button>
      </div>

      <div
        ref={elRef}
        className="h-72 w-full overflow-hidden rounded-xl border border-border"
        style={{ zIndex: 0 }}
      />

      <p className="text-xs text-muted-foreground">
        Klik atau geser pin di peta untuk menentukan titik kantor. Titik:{' '}
        <span className="font-medium text-foreground">
          {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
        </span>
      </p>
    </div>
  );
}
