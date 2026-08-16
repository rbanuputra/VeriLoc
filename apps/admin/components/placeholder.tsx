import { Card, CardContent } from '@/components/ui/card';

export function Placeholder({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      <Card>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          Halaman ini sedang dibangun.
        </CardContent>
      </Card>
    </div>
  );
}
