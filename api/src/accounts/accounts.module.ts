/**
 * AccountsModule — Módulo NestJS que conecta todas las capas.
 *
 * Aquí se cumple la inversión de dependencias de Clean Architecture:
 *   - El dominio define la INTERFAZ del repositorio.
 *   - Este módulo elige la IMPLEMENTACIÓN concreta (en memoria + JSON).
 *   - Los casos de uso reciben el repositorio vía factory (sin conocer NestJS).
 *   - El controller recibe los casos de uso vía inyección estándar.
 *
 * Para cambiar a otra persistencia (ej: PostgreSQL), solo hay que:
 *   1. Crear una nueva clase que implemente AccountRepository.
 *   2. Cambiar el useFactory de ACCOUNT_REPOSITORY aquí.
 *   3. Nada más — dominio, casos de uso y controller no cambian.
 */

import { Module } from '@nestjs/common';

import { AccountsController } from './accounts.controller.js';
import { InMemoryAccountRepository } from '../infrastructure/persistence/in-memory-account.repository.js';
import { CreateAccountUseCase } from '../application/use-cases/create-account.use-case.js';
import { GetCatalogTreeUseCase } from '../application/use-cases/get-catalog-tree.use-case.js';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case.js';
import type { AccountRepository } from '../domain/repositories/account.repository.js';

/**
 * Token de inyección para el repositorio de cuentas.
 * Se usa un string porque la interfaz AccountRepository no existe
 * en tiempo de ejecución (es solo un tipo de TypeScript).
 */
const ACCOUNT_REPOSITORY = 'ACCOUNT_REPOSITORY';

@Module({
  controllers: [AccountsController],
  providers: [
    /**
     * Proveedor del repositorio: instancia manualmente InMemoryAccountRepository.
     * Se usa useFactory en lugar de useClass para que la clase del repositorio
     * no necesite el decorador @Injectable() — se mantiene pura.
     */
    {
      provide: ACCOUNT_REPOSITORY,
      useFactory: () => new InMemoryAccountRepository(),
    },

    /**
     * Proveedor del caso de uso CreateAccount.
     * Recibe el repositorio ya instanciado y lo pasa al constructor.
     * El caso de uso no sabe que está en NestJS — solo recibe una interfaz.
     */
    {
      provide: CreateAccountUseCase,
      useFactory: (repo: AccountRepository) => new CreateAccountUseCase(repo),
      inject: [ACCOUNT_REPOSITORY],
    },

    /**
     * Proveedor del caso de uso GetCatalogTree.
     * Mismo patrón: factory que inyecta el repositorio.
     */
    {
      provide: GetCatalogTreeUseCase,
      useFactory: (repo: AccountRepository) => new GetCatalogTreeUseCase(repo),
      inject: [ACCOUNT_REPOSITORY],
    },

    /**
     * Proveedor del caso de uso DeleteAccount.
     * Mismo patrón: factory que inyecta el repositorio.
     */
    {
      provide: DeleteAccountUseCase,
      useFactory: (repo: AccountRepository) => new DeleteAccountUseCase(repo),
      inject: [ACCOUNT_REPOSITORY],
    },
  ],
})
export class AccountsModule {}

