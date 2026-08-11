import type { LucideIcon } from 'lucide-react';

export function OperationalEmptyState({ icon: Icon, title, description, actionLabel, href }: { icon: LucideIcon; title: string; description: string; actionLabel: string; href: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      <a href={href} className="mt-3 inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">{actionLabel}</a>
    </div>
  );
}
