/**
 * Errores de dominio — Excepciones específicas del negocio.
 *
 * Estas clases representan violaciones de reglas de negocio del catálogo
 * de cuentas. Son errores puros de dominio, SIN acoplamiento a HTTP
 * ni a NestJS.
 *
 * La capa de infraestructura (controller) se encarga de traducir
 * estos errores a respuestas HTTP con el código adecuado.
 */

/**
 * Se lanza cuando el código de la cuenta no es válido:
 * no es numérico o su longitud no es 1, 2, 4 ni 6.
 */
export class InvalidAccountCodeError extends Error {
  constructor(code: string) {
    super(
      `El código "${code}" no es válido. Debe ser numérico y tener 1, 2, 4 o 6 dígitos.`,
    );
    this.name = 'InvalidAccountCodeError';
  }
}

/**
 * Se lanza cuando ya existe una cuenta con el mismo código.
 * El código es único en todo el catálogo.
 */
export class AccountAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Ya existe una cuenta con el código "${code}".`);
    this.name = 'AccountAlreadyExistsError';
  }
}

/**
 * Se lanza cuando se intenta crear una cuenta cuyo padre
 * no existe en el catálogo.
 * Ejemplo: crear "1105" sin que exista "11".
 */
export class ParentNotFoundError extends Error {
  /** Código del padre que se esperaba encontrar */
  readonly parentCode: string;

  constructor(code: string, parentCode: string) {
    super(
      `No se puede crear la cuenta "${code}" porque su padre "${parentCode}" no existe.`,
    );
    this.name = 'ParentNotFoundError';
    this.parentCode = parentCode;
  }
}

/**
 * Se lanza cuando se intenta eliminar una cuenta que tiene
 * cuentas hijas dependientes.
 * Regla: no se puede eliminar una cuenta que tenga hijas.
 */
export class AccountHasChildrenError extends Error {
  constructor(code: string) {
    super(
      `No se puede eliminar la cuenta "${code}" porque tiene cuentas hijas.`,
    );
    this.name = 'AccountHasChildrenError';
  }
}

/**
 * Se lanza cuando se busca una cuenta que no existe.
 * Se usa al intentar eliminar un código inexistente.
 */
export class AccountNotFoundError extends Error {
  constructor(code: string) {
    super(`No se encontró la cuenta con código "${code}".`);
    this.name = 'AccountNotFoundError';
  }
}

/**
 * Se lanza cuando se intenta crear una cuenta de nivel clase
 * sin especificar su naturaleza (débito o crédito).
 */
export class NatureRequiredError extends Error {
  constructor(code: string) {
    super(
      `La cuenta "${code}" es una clase y requiere naturaleza (débito o crédito).`,
    );
    this.name = 'NatureRequiredError';
  }
}

