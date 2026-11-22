/**
 * DeleteAccountUseCase — Caso de uso: eliminar una cuenta contable.
 *
 * Valida que la cuenta exista y que no tenga hijas antes de eliminarla.
 *
 * Reglas de negocio:
 *   - No se puede eliminar una cuenta que no existe.
 *   - No se puede eliminar una cuenta que tenga cuentas hijas
 *     (para mantener la integridad del catálogo).
 *
 * Esta clase es TypeScript puro — NO depende de NestJS.
 */

import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import {
  AccountNotFoundError,
  AccountHasChildrenError,
} from '../../domain/errors/domain-errors.js';

export class DeleteAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Ejecuta la eliminación de una cuenta por su código.
   * No retorna nada si la operación es exitosa.
   * Lanza un error de dominio si la cuenta no existe o tiene hijas.
   */
  execute(code: string): void {
    /* 1. Verificar que la cuenta existe */
    const account = this.accountRepository.findByCode(code);
    if (!account) {
      throw new AccountNotFoundError(code);
    }

    /* 2. Verificar que no tenga cuentas hijas dependientes */
    if (this.accountRepository.hasChildren(code)) {
      throw new AccountHasChildrenError(code);
    }

    /* 3. Eliminar la cuenta del catálogo */
    this.accountRepository.delete(code);
  }
}

