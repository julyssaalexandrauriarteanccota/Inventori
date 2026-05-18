import { notFound } from "next/navigation"

import { ErpRoutePlaceholder } from "@/components/erp-route-placeholder"
import { getExactErpRoute } from "@/lib/erp-navigation"

type ErpPlaceholderPageProps = {
  params: Promise<{
    slug: string[]
  }>
}

export default async function ErpPlaceholderPage({
  params,
}: ErpPlaceholderPageProps) {
  const resolvedParams = await params
  const pathname = `/${resolvedParams.slug.join("/")}`
  const route = getExactErpRoute(pathname)

  if (!route || pathname === "/dashboard" || pathname === "/acceso-denegado") {
    notFound()
  }

  return (
    <ErpRoutePlaceholder
      title={route.title}
      description={route.description}
      path={route.url}
      roles={route.roles}
    />
  )
}
