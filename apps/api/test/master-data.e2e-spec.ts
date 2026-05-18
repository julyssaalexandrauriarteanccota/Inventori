import { INestApplication } from '@nestjs/common';
import request = require('supertest');

import { TipoCliente, TipoProducto } from '@erp/shared';

import { createTestApp, TestAppContext } from './test-app.factory';

type TestCliente = {
  id: string;
  tipo: TipoCliente;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  razonSocial: string | null;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  referencia: string | null;
  notas: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type TestCategoria = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoProducto;
  padreId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type TestMarca = {
  id: string;
  nombre: string;
  tipos: TipoProducto[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type TestProducto = {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoProducto;
  categoriaId: string;
  marcaId: string | null;
  modelo: string | null;
  unidadMedidaId: string;
  precioCompra: number;
  precioVenta: number;
  precioMinimo: number;
  stockMinimo: number;
  manejaInventario: boolean;
  tieneNumeroSerie: boolean;
  esConsumible: boolean;
  imagen: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const defaultUnidadMedidaId = '77777777-7777-4777-8777-000000000001';

function extractSearch(where?: Record<string, unknown>) {
  if (!where?.OR || !Array.isArray(where.OR) || where.OR.length === 0) {
    return null;
  }

  for (const condition of where.OR as Array<Record<string, unknown>>) {
    const fieldConfig = Object.values(condition)[0] as
      | { contains?: string }
      | undefined;
    if (fieldConfig?.contains) {
      return fieldConfig.contains.toLowerCase();
    }
  }

  return null;
}

describe('Sprint 02 Master Data (e2e)', () => {
  let app: INestApplication;
  let context: TestAppContext;

  beforeEach(async () => {
    context = await createTestApp();
    app = context.app;

    const now = new Date('2026-04-06T00:00:00.000Z');
    const clientes: TestCliente[] = [];
    const categorias: TestCategoria[] = [];
    const marcas: TestMarca[] = [];
    const unidadesMedida = [
      {
        id: defaultUnidadMedidaId,
        codigo: 'UND',
        nombre: 'Unidad',
        activo: true,
        deletedAt: null,
      },
    ];
    const productos: TestProducto[] = [];

    const prismaMock = context.prismaMock as Record<string, any>;

    prismaMock.contactoCliente = {
      create: jest.fn(({ data }: { data: Record<string, string | null> }) =>
        Promise.resolve({
          id: `contacto-${clientes.length + 1}`,
          fecha: now,
          createdAt: now,
          ...data,
        }),
      ),
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.equipoCliente = {
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.ticket = {
      findMany: jest.fn(() => Promise.resolve([])),
    };

    prismaMock.cliente = {
      findFirst: jest.fn(
        ({
          where,
          include,
        }: {
          where?: Record<string, any>;
          include?: Record<string, any>;
        }) => {
          const cliente = clientes.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.dni && candidate.dni !== where.dni) return false;
            if (where.ruc && candidate.ruc !== where.ruc) return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            if (where.id?.not && candidate.id === where.id.not) return false;
            return true;
          });

          if (!cliente) {
            return Promise.resolve(null);
          }

          if (include?.contactos) {
            return Promise.resolve({ ...cliente, contactos: [] });
          }

          return Promise.resolve(cliente);
        },
      ),
      findMany: jest.fn(
        ({
          where,
          skip = 0,
          take = 20,
        }: {
          where?: Record<string, any>;
          skip?: number;
          take?: number;
        }) => {
          const search = extractSearch(where);
          const filtered = clientes.filter((candidate) => {
            if (where?.deletedAt === null && candidate.deletedAt !== null)
              return false;
            if (where?.tipo && candidate.tipo !== where.tipo) return false;
            if (!search) return true;

            return [
              candidate.nombre,
              candidate.apellido,
              candidate.razonSocial,
              candidate.dni,
              candidate.ruc,
              candidate.email,
            ].some(
              (value) =>
                typeof value === 'string' &&
                value.toLowerCase().includes(search),
            );
          });

          return Promise.resolve(filtered.slice(skip, skip + take));
        },
      ),
      count: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const search = extractSearch(where);
        const total = clientes.filter((candidate) => {
          if (where?.deletedAt === null && candidate.deletedAt !== null)
            return false;
          if (where?.tipo && candidate.tipo !== where.tipo) return false;
          if (!search) return true;

          return [
            candidate.nombre,
            candidate.apellido,
            candidate.razonSocial,
            candidate.dni,
            candidate.ruc,
            candidate.email,
          ].some(
            (value) =>
              typeof value === 'string' && value.toLowerCase().includes(search),
          );
        }).length;

        return Promise.resolve(total);
      }),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const cliente: TestCliente = {
          id: `33333333-3333-4333-8333-${String(clientes.length + 1).padStart(12, '0')}`,
          tipo: data.tipo,
          nombre: data.nombre ?? null,
          apellido: data.apellido ?? null,
          dni: data.dni ?? null,
          razonSocial: data.razonSocial ?? null,
          ruc: data.ruc ?? null,
          email: data.email ?? null,
          telefono: data.telefono ?? null,
          celular: data.celular ?? null,
          direccion: data.direccion ?? null,
          distrito: data.distrito ?? null,
          provincia: data.provincia ?? null,
          departamento: data.departamento ?? null,
          referencia: data.referencia ?? null,
          notas: data.notas ?? null,
          activo: data.activo ?? true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        clientes.push(cliente);
        return Promise.resolve(cliente);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const cliente = clientes.find(
            (candidate) => candidate.id === where.id,
          );
          if (!cliente) return Promise.resolve(null);
          Object.assign(cliente, data, { updatedAt: new Date() });
          return Promise.resolve(cliente);
        },
      ),
    };

    prismaMock.categoria = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const categoria = categorias.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.nombre && candidate.nombre !== where.nombre) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          if (where.id?.not && candidate.id === where.id.not) return false;
          return true;
        });

        return Promise.resolve(categoria ?? null);
      }),
      findUnique: jest.fn(({ where }: { where: Record<string, string> }) => {
        if (where.id) {
          return Promise.resolve(
            categorias.find((candidate) => candidate.id === where.id) ?? null,
          );
        }
        return Promise.resolve(
          categorias.find((candidate) => candidate.nombre === where.nombre) ??
            null,
        );
      }),
      findMany: jest.fn(() =>
        Promise.resolve(
          categorias.filter((candidate) => candidate.deletedAt === null),
        ),
      ),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const categoria: TestCategoria = {
          id: `44444444-4444-4444-8444-${String(categorias.length + 1).padStart(12, '0')}`,
          nombre: data.nombre,
          descripcion: data.descripcion ?? null,
          tipo: data.tipo ?? TipoProducto.REPUESTO,
          padreId: data.padreId ?? null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        categorias.push(categoria);
        return Promise.resolve(categoria);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const categoria = categorias.find(
            (candidate) => candidate.id === where.id,
          );
          if (!categoria) return Promise.resolve(null);
          Object.assign(categoria, data, { updatedAt: new Date() });
          return Promise.resolve(categoria);
        },
      ),
    };

    prismaMock.marca = {
      findFirst: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const marca = marcas.find((candidate) => {
          if (!where) return false;
          if (where.id && candidate.id !== where.id) return false;
          if (where.nombre && candidate.nombre !== where.nombre) return false;
          if (where.deletedAt === null && candidate.deletedAt !== null)
            return false;
          if (where.id?.not && candidate.id === where.id.not) return false;
          return true;
        });

        return Promise.resolve(marca ?? null);
      }),
      findUnique: jest.fn(({ where }: { where: Record<string, string> }) => {
        if (where.id) {
          return Promise.resolve(
            marcas.find((candidate) => candidate.id === where.id) ?? null,
          );
        }
        return Promise.resolve(
          marcas.find((candidate) => candidate.nombre === where.nombre) ?? null,
        );
      }),
      findMany: jest.fn(() =>
        Promise.resolve(
          marcas.filter((candidate) => candidate.deletedAt === null),
        ),
      ),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const marca: TestMarca = {
          id: `55555555-5555-5555-8555-${String(marcas.length + 1).padStart(12, '0')}`,
          nombre: data.nombre,
          tipos: data.tipos ?? [TipoProducto.EQUIPO],
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        marcas.push(marca);
        return Promise.resolve(marca);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const marca = marcas.find((candidate) => candidate.id === where.id);
          if (!marca) return Promise.resolve(null);
          Object.assign(marca, data, { updatedAt: new Date() });
          return Promise.resolve(marca);
        },
      ),
    };

    prismaMock.unidadMedida = {
      findUnique: jest.fn(({ where }: { where: { id: string } }) => {
        return Promise.resolve(
          unidadesMedida.find((candidate) => candidate.id === where.id) ?? null,
        );
      }),
    };

    prismaMock.productoProveedor = {
      findUnique: jest.fn(() => Promise.resolve(null)),
      findMany: jest.fn(() => Promise.resolve([])),
      create: jest.fn(),
      updateMany: jest.fn(() => Promise.resolve({ count: 0 })),
      delete: jest.fn(),
    };

    prismaMock.proveedor = {
      findFirst: jest.fn(() => Promise.resolve(null)),
      findMany: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
      create: jest.fn(),
      update: jest.fn(),
    };

    prismaMock.compatibilidad = {
      findUnique: jest.fn(() => Promise.resolve(null)),
      findMany: jest.fn(() => Promise.resolve([])),
      create: jest.fn(),
      delete: jest.fn(),
    };

    prismaMock.producto = {
      findFirst: jest.fn(
        ({
          where,
          include,
        }: {
          where?: Record<string, any>;
          include?: Record<string, any>;
        }) => {
          const producto = productos.find((candidate) => {
            if (!where) return false;
            if (where.id && candidate.id !== where.id) return false;
            if (where.sku && candidate.sku !== where.sku) return false;
            if (where.deletedAt === null && candidate.deletedAt !== null)
              return false;
            if (where.id?.not && candidate.id === where.id.not) return false;
            return true;
          });

          if (!producto) return Promise.resolve(null);

          if (include) {
            return Promise.resolve({
              ...producto,
              categoria:
                categorias.find(
                  (candidate) => candidate.id === producto.categoriaId,
                ) ?? null,
              marca: producto.marcaId
                ? (marcas.find(
                    (candidate) => candidate.id === producto.marcaId,
                  ) ?? null)
                : null,
              productoProveedores: [],
              compatibilidadesComoRepuesto: [],
            });
          }

          return Promise.resolve(producto);
        },
      ),
      findMany: jest.fn(
        ({
          where,
          skip = 0,
          take = 20,
        }: {
          where?: Record<string, any>;
          skip?: number;
          take?: number;
        }) => {
          const search = extractSearch(where);
          const filtered = productos.filter((candidate) => {
            if (where?.deletedAt === null && candidate.deletedAt !== null)
              return false;
            if (
              where?.categoriaId &&
              candidate.categoriaId !== where.categoriaId
            )
              return false;
            if (where?.marcaId && candidate.marcaId !== where.marcaId)
              return false;
            if (
              typeof where?.esConsumible === 'boolean' &&
              candidate.esConsumible !== where.esConsumible
            )
              return false;
            if (
              typeof where?.tieneNumeroSerie === 'boolean' &&
              candidate.tieneNumeroSerie !== where.tieneNumeroSerie
            )
              return false;
            if (!search) return true;

            return [candidate.nombre, candidate.sku, candidate.modelo].some(
              (value) =>
                typeof value === 'string' &&
                value.toLowerCase().includes(search),
            );
          });

          return Promise.resolve(
            filtered.slice(skip, skip + take).map((producto) => ({
              ...producto,
              categoria: categorias
                .filter((candidate) => candidate.id === producto.categoriaId)
                .map((candidate) => ({
                  id: candidate.id,
                  nombre: candidate.nombre,
                }))[0],
              marca: producto.marcaId
                ? (marcas
                    .filter((candidate) => candidate.id === producto.marcaId)
                    .map((candidate) => ({
                      id: candidate.id,
                      nombre: candidate.nombre,
                    }))[0] ?? null)
                : null,
            })),
          );
        },
      ),
      count: jest.fn(({ where }: { where?: Record<string, any> }) => {
        const search = extractSearch(where);
        const total = productos.filter((candidate) => {
          if (where?.deletedAt === null && candidate.deletedAt !== null)
            return false;
          if (where?.categoriaId && candidate.categoriaId !== where.categoriaId)
            return false;
          if (where?.marcaId && candidate.marcaId !== where.marcaId)
            return false;
          if (
            typeof where?.esConsumible === 'boolean' &&
            candidate.esConsumible !== where.esConsumible
          )
            return false;
          if (
            typeof where?.tieneNumeroSerie === 'boolean' &&
            candidate.tieneNumeroSerie !== where.tieneNumeroSerie
          )
            return false;
          if (!search) return true;

          return [candidate.nombre, candidate.sku, candidate.modelo].some(
            (value) =>
              typeof value === 'string' && value.toLowerCase().includes(search),
          );
        }).length;

        return Promise.resolve(total);
      }),
      create: jest.fn(({ data }: { data: Record<string, any> }) => {
        const producto: TestProducto = {
          id: `66666666-6666-4666-8666-${String(productos.length + 1).padStart(12, '0')}`,
          sku: data.sku,
          nombre: data.nombre,
          descripcion: data.descripcion ?? null,
          tipo: data.tipo,
          categoriaId: data.categoriaId,
          marcaId: data.marcaId ?? null,
          modelo: data.modelo ?? null,
          unidadMedidaId: data.unidadMedidaId,
          precioCompra: data.precioCompra,
          precioVenta: data.precioVenta,
          precioMinimo: data.precioMinimo,
          stockMinimo: data.stockMinimo ?? 0,
          manejaInventario: data.manejaInventario ?? true,
          tieneNumeroSerie: data.tieneNumeroSerie ?? false,
          esConsumible: data.esConsumible ?? false,
          imagen: data.imagen ?? null,
          activo: data.activo ?? true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        productos.push(producto);
        return Promise.resolve(producto);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, any>;
        }) => {
          const producto = productos.find(
            (candidate) => candidate.id === where.id,
          );
          if (!producto) return Promise.resolve(null);
          Object.assign(producto, data, { updatedAt: new Date() });
          return Promise.resolve(producto);
        },
      ),
    };
  });

  afterEach(async () => {
    await app.close();
  });

  async function loginAsAdmin() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@erp.local',
        password: 'Admin123!',
      })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  it('crea cliente natural, categoria, marca y producto via HTTP', async () => {
    const token = await loginAsAdmin();

    const clienteResponse = await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'NATURAL',
        nombre: 'Juan',
        apellido: 'Perez',
        dni: '12345678',
        email: 'juan@example.com',
      })
      .expect(201);

    expect(clienteResponse.body.data.tipo).toBe('NATURAL');

    const categoriaResponse = await request(app.getHttpServer())
      .post('/api/v1/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Impresoras', tipo: 'EQUIPO' })
      .expect(201);

    const marcaResponse = await request(app.getHttpServer())
      .post('/api/v1/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Konica Minolta', tipos: ['EQUIPO'] })
      .expect(201);

    const productoResponse = await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'KM-BZ-001',
        nombre: 'Bizhub C258',
        categoriaId: categoriaResponse.body.data.id,
        marcaId: marcaResponse.body.data.id,
        unidadMedidaId: defaultUnidadMedidaId,
        precioCompra: 5000,
        precioVenta: 8000,
        precioMinimo: 7000,
        tieneNumeroSerie: true,
      })
      .expect(201);

    expect(productoResponse.body.data.sku).toBe('KM-BZ-001');
  });

  it('permite buscar por nombre, DNI, RUC y SKU', async () => {
    const token = await loginAsAdmin();

    await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'NATURAL',
        nombre: 'Juan',
        apellido: 'Perez',
        dni: '12345678',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'EMPRESA',
        razonSocial: 'Copiadoras del Peru SAC',
        ruc: '20123456789',
      })
      .expect(201);

    const categoriaResponse = await request(app.getHttpServer())
      .post('/api/v1/categorias')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Insumos', tipo: 'INSUMO' })
      .expect(201);

    const marcaResponse = await request(app.getHttpServer())
      .post('/api/v1/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Canon', tipos: ['INSUMO'] })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        sku: 'CN-REP-001',
        nombre: 'Tambor Canon 001',
        categoriaId: categoriaResponse.body.data.id,
        marcaId: marcaResponse.body.data.id,
        unidadMedidaId: defaultUnidadMedidaId,
        precioCompra: 100,
        precioVenta: 150,
        precioMinimo: 120,
        esConsumible: true,
      })
      .expect(201);

    const byNombre = await request(app.getHttpServer())
      .get('/api/v1/clientes?search=Juan')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      byNombre.body.data.some(
        (item: { dni: string | null }) => item.dni === '12345678',
      ),
    ).toBe(true);

    const byDni = await request(app.getHttpServer())
      .get('/api/v1/clientes?search=12345678')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      byDni.body.data.some(
        (item: { nombre: string | null }) => item.nombre === 'Juan',
      ),
    ).toBe(true);

    const byRuc = await request(app.getHttpServer())
      .get('/api/v1/clientes?search=20123456789')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      byRuc.body.data.some(
        (item: { razonSocial: string | null }) =>
          item.razonSocial === 'Copiadoras del Peru SAC',
      ),
    ).toBe(true);

    const bySku = await request(app.getHttpServer())
      .get('/api/v1/productos?search=CN-REP-001')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      bySku.body.data.some(
        (item: { sku: string }) => item.sku === 'CN-REP-001',
      ),
    ).toBe(true);
  });
});
