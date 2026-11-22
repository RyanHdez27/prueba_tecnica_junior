/**
 * Interfaz AccountRepository — Contrato del repositorio de cuentas.
 *
 * Define las operaciones de persistencia que necesitan los casos de uso.
 * El dominio solo conoce ESTA INTERFAZ; nunca la implementación concreta
 * (en memoria, SQL, etc.). Esto cumple el principio de inversión de
 * dependencias de Clean Architecture.
 *
 * La implementación real vive en la capa de infraestructura.
 */

import { Account } from '../entities/account.entity.js';

export interface AccountRepository {
  /**
   * Busca una cuenta por su código único.
   * Retorna la cuenta encontrada o null si no existe.
   */
  findByCode(code: string): Account | null;

  /**
   * Devuelve TODAS las cuentas del catálogo en una lista plana.
   * El armado del árbol se hace en el caso de uso, no aquí.
   */
  findAll(): Account[];

  /**
   * Persiste una nueva cuenta en el catálogo.
   * No valida reglas de negocio — eso es responsabilidad del caso de uso.
   */
  save(account: Account): void;

  /**
   * Elimina una cuenta por su código.
   * No valida si tiene hijas — eso es responsabilidad del caso de uso.
   */
  delete(code: string): void;

  /**
   * Verifica si una cuenta tiene cuentas hijas directas.
   * Se usa antes de eliminar: no se puede borrar una cuenta con hijas.
   */
  hasChildren(code: string): boolean;
}

