/**
 * CreateAccountUseCase — Caso de uso: crear una cuenta contable.
 *
 * Capa de aplicación (Clean Architecture). Orquesta la lógica de negocio
 * para crear una cuenta nueva en el catálogo.
 *
 * Validaciones que realiza:
 *   1. El código es numérico y tiene longitud válida (1, 2, 4 o 6).
 *   2. No existe ya una cuenta con ese código.
 *   3. Si es clase (1 dígito): la naturaleza es obligatoria.
 *   4. Si NO es clase: el padre directo debe existir y la naturaleza
 *      se hereda de la clase ancestro (primer dígito del código).
 *
 * Esta clase es TypeScript puro — NO depende de NestJS.
 * El módulo NestJS la instancia vía factory en accounts.module.ts.
 */

import { Account } from '../../domain/entities/account.entity.js';
import type { AccountNature } from '../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';
import {
  InvalidAccountCodeError,
  AccountAlreadyExistsError,
  ParentNotFoundError,
  NatureRequiredError,
} from '../../domain/errors/domain-errors.js';

/** Datos de entrada que recibe el caso de uso */
export interface CreateAccountInput {
  code: string;
  name: string;
  nature?: AccountNature;
}

export class CreateAccountUseCase {
  /** Recibe la interfaz del repositorio (inyectada por el módulo NestJS) */
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Ejecuta la creación de una cuenta.
   * Retorna la cuenta creada si todo es válido.
   * Lanza un error de dominio si alguna regla se viola.
   */
  execute(input: CreateAccountInput): Account {
    const { code, name, nature } = input;

    /* 1. Validar formato del código (numérico, longitud 1/2/4/6) */
    if (!Account.isValidCode(code)) {
      throw new InvalidAccountCodeError(code);
    }

    /* 2. Verificar que el código no esté ya en uso */
    if (this.accountRepository.findByCode(code) !== null) {
      throw new AccountAlreadyExistsError(code);
    }

    /* 3. Determinar la naturaleza según el nivel jerárquico */
    let accountNature: AccountNature;

    if (code.length === 1) {
      /**
       * Es una CLASE (nivel raíz).
       * La naturaleza es obligatoria porque las clases definen
       * si sus descendientes son de débito o crédito.
       */
      if (!nature) {
        throw new NatureRequiredError(code);
      }
      accountNature = nature;
    } else {
      /**
       * No es clase → validar que el padre directo exista.
       * El padre se obtiene recortando el código a la longitud
       * del nivel anterior (ej: "1105" → padre "11").
       */
      const parentCode = Account.getParentCodeOf(code)!;
      const parent = this.accountRepository.findByCode(parentCode);

      if (!parent) {
        throw new ParentNotFoundError(code, parentCode);
      }

      /**
       * Heredar naturaleza de la clase ancestro.
       * La clase siempre es el primer dígito del código.
       * Si el padre existe, toda la cadena hasta la clase
       * ya fue validada en creaciones anteriores.
       */
      const classCode = code.substring(0, 1);
      const classAccount = this.accountRepository.findByCode(classCode)!;
      accountNature = classAccount.nature;
    }

    /* 4. Crear la entidad y persistirla */
    const account = new Account(code, name, accountNature);
    this.accountRepository.save(account);

    return account;
  }
}

