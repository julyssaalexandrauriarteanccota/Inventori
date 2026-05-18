'use client'

import Link from 'next/link'
import { Construction, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ComingSoonProps {
  title: string
  description: string
  features: string[]
  fase?: string
}

export function ComingSoon({ title, description, features, fase = 'Fase 2' }: ComingSoonProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
        <Construction className="size-8" />
      </div>
      <div>
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/10 text-[10px] uppercase tracking-wide text-primary"
        >
          Próximamente · {fase}
        </Badge>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <ul className="mx-auto grid w-full max-w-md gap-2 text-left text-sm">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 rounded-lg border border-primary/20 bg-card p-3 text-muted-foreground"
          >
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Link href="/pos">Volver al POS</Link>
      </Button>
    </div>
  )
}
