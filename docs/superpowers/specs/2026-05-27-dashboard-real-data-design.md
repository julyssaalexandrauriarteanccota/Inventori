# Dashboard Real Data Design

Date: 2026-05-27

## Summary
Replace dashboard mock data with real data. Add an API endpoint for the 7-day series (ventas vs stock) and wire the dashboard components to use the real endpoints for series and recent activity.

## Goals
- Replace the "ventas vs stock" chart mock data with real 7-day series data.
- Replace recent activity mock data with audit log data.
- Keep current dashboard layout and components; only wire real data.

## Non-goals
- No UI redesign.
- No new realtime logic beyond existing query refresh.
- No changes to existing KPI endpoint /reportes/dashboard.

## Current Context
- KPIs already use /reportes/dashboard via useDashboardKpis.
- Recent activity uses a local mock list.
- The chart uses a local mock series.

## API Changes
### New endpoint
- GET /reportes/dashboard/series?days=7
- Roles: ADMIN, ENCARGADO
- Response shape:
  - data: { series: [{ date, label, ventas, stock }] }
  - meta: { timestamp }

### Data sourcing logic
- Range: last N days, inclusive of today, default N=7, max=30.
- ventas:
  - Sum of venta.total per day where estado=ENTREGADA and deletedAt=null.
- stock:
  - Start from current total stock (sum(almacen_stock.cantidad)).
  - Build net delta per day from movimiento_stock:
    - ENTRADA => +cantidad
    - SALIDA => -cantidad
    - TRANSFERENCIA => 0
  - Use tipo_movimiento_config to map movimiento_stock.tipo to comportamiento.
  - Compute stock for each day by walking backwards from today.

## Frontend Changes
### Hooks
- Add useDashboardSeries(days=7) to fetch /reportes/dashboard/series.
- Query key: ['dashboard', 'series', days]

### Components
- DualWeeklyBars:
  - Accept series data as props.
  - Render loading skeleton while fetching.
  - Render empty state if series is empty.
- RecentActivity:
  - Use useAuditoria({ page: 1, limit: 3 }) as data source.
  - Map accion/modelo/usuario to UI text and badge colors.
  - Only show for ADMIN to avoid 403 from /config/auditoria.

### Dashboard page
- Replace demo label with "ultimos 7 dias".
- Wire DualWeeklyBars and RecentActivity to their hooks.

## Error Handling
- API returns empty series when there is no data in range.
- Frontend shows an empty state for missing series.
- If audit data is unavailable, show an empty state (admin-only fetch).

## Testing
- Add unit tests for ReportesService.getDashboardSeries:
  - Correct daily aggregation of ventas.
  - Correct stock series with entrada/salida movements.
  - Handles empty data.

## Assumptions
- Recent activity is visible only to ADMIN (source is /config/auditoria).
