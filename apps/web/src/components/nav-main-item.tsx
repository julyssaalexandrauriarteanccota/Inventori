"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import type { NavBadgeValue } from "@/components/nav-badges"
import {
  navButtonClasses,
  SidebarNavBadge,
  SidebarNavIconTile,
  subButtonClasses,
} from "@/components/nav-main-primitives"
import type { NavItem } from "@/components/nav-main.types"
import { resolveBadgeValue } from "@/components/nav-main-utils"

export function NavMainItem({
  item,
  activeUrl,
  badges,
}: {
  item: NavItem
  activeUrl?: string
  badges: Record<string, NavBadgeValue>
}) {
  const isExact = activeUrl === item.url
  const activeSubItem = item.items?.find((subItem) => activeUrl === subItem.url)
  const isInside =
    activeUrl === item.url ||
    Boolean(activeSubItem)

  const itemBadge = resolveBadgeValue(item.url, badges, item.badge)
  const subBadgesTotal = item.items?.reduce<number>((total, subItem) => {
    const value = resolveBadgeValue(subItem.url, badges, subItem.badge)
    const parsed = typeof value === "number" ? value : Number(value)

    return total + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
  const aggregateBadge =
    itemBadge ??
    (subBadgesTotal && subBadgesTotal > 0 ? subBadgesTotal : undefined)

  const hasSubItems = Boolean(item.items && item.items.length > 0)

  if (hasSubItems) {
    return (
      <Collapsible
        asChild
        key={item.title}
        defaultOpen={Boolean(isInside)}
        className="group/collapsible"
      >
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={item.title}
            asChild
            isActive={Boolean(isInside)}
            className={navButtonClasses}
          >
            <Link href={item.url}>
              <SidebarNavIconTile
                icon={item.icon}
                active={Boolean(isInside)}
                badge={aggregateBadge}
              />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {item.title}
              </span>
              {aggregateBadge != null ? (
                <SidebarNavBadge
                  value={aggregateBadge}
                  active={Boolean(isInside)}
                  className="mr-5 group-data-[collapsible=icon]:hidden"
                />
              ) : null}
            </Link>
          </SidebarMenuButton>
          <CollapsibleTrigger asChild>
            <SidebarMenuAction
              aria-label={`Mostrar apartados de ${item.title}`}
              className="right-1.5 top-2 text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"
            >
              <ChevronRight className="size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuAction>
          </CollapsibleTrigger>
          <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuSub className="ml-[1.45rem] border-l-sidebar-border/70">
              {item.items?.map((subItem) => {
                const isSubActive = activeUrl === subItem.url
                const subBadge = resolveBadgeValue(
                  subItem.url,
                  badges,
                  subItem.badge,
                )

                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={isSubActive}
                      className={subButtonClasses}
                    >
                      <Link href={subItem.url}>
                        <span className="truncate">{subItem.title}</span>
                        {subBadge != null ? (
                          <SidebarNavBadge
                            value={subBadge}
                            active={isSubActive}
                          />
                        ) : null}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  const targetUrl = item.url
  const active = isExact || Boolean(isInside)

  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        tooltip={item.title}
        asChild
        isActive={active}
        className={navButtonClasses}
      >
        <Link href={targetUrl}>
          <SidebarNavIconTile
            icon={item.icon}
            active={active}
            badge={aggregateBadge}
          />
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
          {aggregateBadge != null ? (
            <SidebarNavBadge
              value={aggregateBadge}
              active={active}
              className="group-data-[collapsible=icon]:hidden"
            />
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
