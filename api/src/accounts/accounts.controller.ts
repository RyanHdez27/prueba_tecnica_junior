/**
 * AccountsController — Controlador REST para el catálogo de cuentas.
 *
 * Esta es la capa de INFRAESTRUCTURA (adaptador HTTP) de Clean Architecture.
 * Su responsabilidad es:
 *   1. Recibir peticiones HTTP.
 *   2. Delegar la lógica al caso de uso correspondiente.
 *   3. Traducir errores de dominio a respuestas HTTP con códigos adecuados.
 *   4. Incluir el campo "field" en errores para que el frontend
 *      muestre el mensaje junto al input que lo causó.
 *
 * Endpoints:
 *   POST   /accounts      → crear cuenta
 *   GET    /accounts/tree  → catálogo como árbol anidado
 *   DELETE /accounts/:code → eliminar cuenta por código
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';

import { CreateAccountDto } from './dto/create-account.dto.js';
import { CreateAccountUseCase } from '../application/use-cases/create-account.use-case.js';
import { GetCatalogTreeUseCase } from '../application/use-cases/get-catalog-tree.use-case.js';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case.js';
import {
  InvalidAccountCodeError,
  AccountAlreadyExistsError,
  ParentNotFoundError,
  NatureRequiredError,
  AccountNotFoundError,
  AccountHasChildrenError,
} from '../domain/errors/domain-errors.js';

@Controller('accounts')
export class AccountsController {
  /**
   * Recibe los 3 casos de uso inyectados por el módulo NestJS.
   * Los casos de uso son clases puras (sin decoradores NestJS);
   * la inyección se configura con factories en accounts.module.ts.
   */
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly getCatalogTreeUseCase: GetCatalogTreeUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
  ) {}

  /**
   * POST /accounts
   * Crea una cuenta nueva. Retorna 201 con la cuenta creada.
   * Errores posibles: 400 (código inválido, padre no existe),
   * 409 (código duplicado).
   */
  @Post()
  create(@Body() dto: CreateAccountDto) {
    try {
      const account = this.createAccountUseCase.execute({
        code: dto.code,
        name: dto.name,
        nature: dto.nature,
      });

      /* Retornar la cuenta creada con su nivel y naturaleza asignada */
      return {
        code: account.code,
        name: account.name,
        nature: account.nature,
        level: account.level,
      };
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * GET /accounts/tree
   * Retorna el catálogo completo como un array de árboles anidados.
   * Cada raíz es una clase con sus descendientes en "children".
   */
  @Get('tree')
  getTree() {
    return this.getCatalogTreeUseCase.execute();
  }

  /**
   * DELETE /accounts/:code
   * Elimina una cuenta por código. Retorna 204 (sin contenido) si tiene éxito.
   * Errores posibles: 404 (no existe), 409 (tiene hijas).
   */
  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('code') code: string) {
    try {
      this.deleteAccountUseCase.execute(code);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * Traduce errores de dominio a respuestas HTTP.
   *
   * Cada error de dominio se mapea a un código HTTP apropiado:
   *   - Validación fallida → 400 Bad Request
   *   - Recurso duplicado → 409 Conflict
   *   - No encontrado → 404 Not Found
   *   - Tiene dependencias → 409 Conflict
   *
   * Se incluye "field" para que el frontend pueda mostrar
   * el error junto al campo correspondiente del formulario.
   */
  private handleDomainError(error: unknown): never {
    if (error instanceof InvalidAccountCodeError) {
      throw new HttpException(
        { statusCode: 400, message: error.message, field: 'code' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof AccountAlreadyExistsError) {
      throw new HttpException(
        { statusCode: 409, message: error.message, field: 'code' },
        HttpStatus.CONFLICT,
      );
    }

    if (error instanceof ParentNotFoundError) {
      throw new HttpException(
        { statusCode: 400, message: error.message, field: 'code' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof NatureRequiredError) {
      throw new HttpException(
        { statusCode: 400, message: error.message, field: 'nature' },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof AccountNotFoundError) {
      throw new HttpException(
        { statusCode: 404, message: error.message },
        HttpStatus.NOT_FOUND,
      );
    }

    if (error instanceof AccountHasChildrenError) {
      throw new HttpException(
        { statusCode: 409, message: error.message },
        HttpStatus.CONFLICT,
      );
    }

    /* Error no reconocido → dejar que NestJS lo maneje como 500 */
    throw error;
  }
}

