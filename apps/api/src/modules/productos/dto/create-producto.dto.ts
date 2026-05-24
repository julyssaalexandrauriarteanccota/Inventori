import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CondicionProducto, TipoProducto } from '@erp/shared';

export class ProductoImagenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'URL o filename devuelto por /uploads' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tamano?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orden?: number;
}

export class ProductoAtributoDto {
  @ApiProperty({ description: 'Clave del atributo (ej. usb, tactil)' })
  @IsString()
  @IsNotEmpty()
  clave: string;

  @ApiPropertyOptional({ description: 'Valor del atributo' })
  @IsOptional()
  @IsString()
  valor?: string;
}

export class StockInicialItemDto {
  @ApiProperty({ description: 'Almacén destino del stock inicial' })
  @IsUUID()
  almacenId: string;

  @ApiProperty({ description: 'Cantidad inicial (entera, > 0)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({
    description: 'Costo unitario referencial. Si se omite usa precioCompra.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoUnitario?: number;
}

export class CreateProductoDto {
  @ApiPropertyOptional({
    description: 'SKU único del producto. Si se omite, el sistema lo genera.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ enum: TipoProducto, default: TipoProducto.REPUESTO })
  @IsOptional()
  @IsEnum(TipoProducto)
  tipo?: TipoProducto;

  @ApiProperty()
  @IsUUID()
  categoriaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  marcaId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  modeloId?: string | null;

  @ApiProperty({ description: 'Unidad de medida asociada al producto' })
  @IsUUID()
  unidadMedidaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigoQr?: string;

  @ApiPropertyOptional({ enum: CondicionProducto })
  @IsOptional()
  @IsEnum(CondicionProducto)
  condicion?: CondicionProducto;

  @ApiProperty({ description: 'Precio de compra (sin IGV)' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioCompra: number;

  @ApiProperty({ description: 'Precio de venta con IGV incluido' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioVenta: number;

  @ApiProperty({
    description: 'Precio mínimo de venta permitido con IGV incluido',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precioMinimo: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  manejaInventario?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Equipos con número de serie',
  })
  @IsOptional()
  @IsBoolean()
  tieneNumeroSerie?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  esConsumible?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiereRepuestos?: boolean;

  @ApiPropertyOptional({
    description: 'Tiempo estimado en minutos para servicios',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  tiempoEstimadoMin?: number;

  @ApiPropertyOptional({
    default: 12,
    description:
      'Meses de garantía estándar para equipos al venderse (por defecto 12).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mesesGarantia?: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Límite máximo de copias cubiertas por la garantía (solo equipos con contador). Null = sin límite por copias.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  garantiaMaxCopias?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imagen?: string;

  @ApiPropertyOptional({ type: [ProductoImagenDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ProductoImagenDto)
  imagenes?: ProductoImagenDto[];

  @ApiPropertyOptional({
    type: [ProductoAtributoDto],
    description: 'Atributos técnicos clave/valor (USB, táctil, dúplex, etc.)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductoAtributoDto)
  atributos?: ProductoAtributoDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    type: () => [StockInicialItemDto],
    description:
      'Stock inicial opcional por almacén. Genera un movimiento AJUSTE_POSITIVO por cada entrada. Solo aplica si manejaInventario=true.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StockInicialItemDto)
  stockInicial?: StockInicialItemDto[];
}
