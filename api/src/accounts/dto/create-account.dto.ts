/**
 * CreateAccountDto — Objeto de transferencia para crear una cuenta.
 *
 * Valida la FORMA de los datos entrantes (tipos, campos requeridos)
 * usando class-validator. Las reglas de NEGOCIO (padre existe,
 * código único, longitud válida) se validan en el caso de uso.
 *
 * Separar validación de forma vs negocio permite que el frontend
 * reciba errores claros y diferenciados:
 *   - Errores de forma → se atrapan antes de tocar el caso de uso.
 *   - Errores de negocio → se atrapan en el controller y se devuelven
 *     con el campo que los causó (field) para mostrarlos junto al input.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Matches,
} from 'class-validator';

import type { AccountNature } from '../../domain/entities/account.entity.js';

export class CreateAccountDto {
  /**
   * Código numérico de la cuenta.
   * El DTO valida que sea string no vacío y solo dígitos.
   * La validación de longitud (1/2/4/6) la hace el caso de uso.
   */
  @IsString({ message: 'El código debe ser texto.' })
  @IsNotEmpty({ message: 'El código es obligatorio.' })
  @Matches(/^\d+$/, {
    message: 'El código debe contener solo dígitos numéricos.',
  })
  code: string;

  /**
   * Nombre descriptivo de la cuenta.
   * Ejemplo: "Caja general", "Disponible", "Activo".
   */
  @IsString({ message: 'El nombre debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  name: string;

  /**
   * Naturaleza contable: "debito" o "credito".
   * Solo es obligatoria para cuentas de tipo clase (1 dígito).
   * Para otros niveles se ignora y se hereda de la clase ancestro.
   * La obligatoriedad condicional se valida en el caso de uso.
   */
  @IsOptional()
  @IsIn(['debito', 'credito'], {
    message: 'La naturaleza debe ser "debito" o "credito".',
  })
  nature?: AccountNature;
}

