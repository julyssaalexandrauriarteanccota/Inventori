import type { LucideIcon } from "lucide-react"

import type { NavBadgeValue } from "@/components/nav-badges"

export type NavSubItem = {
  title: string
  url: string
  badge?: NavBadgeValue
}

export type NavItem = {
  title: string
  url: string
  icon?: LucideIcon
  badge?: NavBadgeValue
  isActive?: boolean
  items?: NavSubItem[]
}

export type NavSection = {
  label: string
  items: NavItem[]
}
