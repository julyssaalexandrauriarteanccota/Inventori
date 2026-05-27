export type RealtimeInvalidationQueryKey = readonly unknown[];

const INVALIDATION_QUERY_KEYS_BY_SCOPE: Record<
  string,
  readonly RealtimeInvalidationQueryKey[]
> = {
  alquileres: [['alquileres'], ['equipos'], ['inventario'], ['caja']],
  auditoria: [['configuracion', 'auditoria']],
  clientes: [['clientes']],
  compras: [['compras'], ['inventario']],
  equipos: [['equipos']],
  garantias: [['garantias'], ['tickets']],
  inventario: [['inventario'], ['reportes', 'stock']],
  productos: [
    ['productos'],
    ['categorias'],
    ['marcas'],
    ['modelos-catalogo'],
    ['unidades-medida'],
  ],
  proveedores: [['proveedores']],
  soporte: [['tickets'], ['reportes', 'tickets']],
  ventas: [['ventas'], ['caja'], ['reportes', 'ventas']],

  // Administración
  configuracion: [['configuracion']],
  usuarios: [['usuarios']],
  ubicaciones: [['ubicaciones']],

  // Facturación SUNAT
  facturacion: [['facturacion'], ['ventas']],

  // Reportes (si se emite explícitamente)
  reportes: [['reportes']],
};

export function getRealtimeInvalidationQueryKeys(scope: string) {
  return INVALIDATION_QUERY_KEYS_BY_SCOPE[scope] ?? [[scope]];
}
