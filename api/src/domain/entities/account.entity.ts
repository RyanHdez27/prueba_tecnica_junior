/**
 * Entidad Account — Capa de dominio pura.
 *
 * Representa una cuenta del catálogo contable.
 * Contiene toda la lógica de negocio relacionada con códigos,
 * niveles jerárquicos y relación padre-hijo.
 *
 * NO depende de NestJS ni de ninguna librería externa.
 */

/** Longitudes válidas de código y su nivel jerárquico correspondiente */
const VALID_LENGTHS = [1, 2, 4, 6] as const;

/** Mapa: longitud de código → nombre del nivel */
const LEVEL_NAMES: Record<number, string> = {
  1: 'clase',
  2: 'grupo',
  4: 'cuenta',
  6: 'subcuenta',
};

/**
 * Mapa: longitud del código hijo → longitud del código padre.
 * Ejemplo: una subcuenta (6 dígitos) tiene como padre una cuenta (4 dígitos).
 */
const PARENT_LENGTH: Record<number, number> = {
  2: 1,
  4: 2,
  6: 4,
};

/** Naturaleza contable: débito o crédito. Solo se asigna a las clases; los descendientes la heredan. */
export type AccountNature = 'debito' | 'credito';

export class Account {
  /** Código numérico único de la cuenta (1, 2, 4 o 6 dígitos) */
  readonly code: string;

  /** Nombre descriptivo de la cuenta */
  readonly name: string;

  /** Naturaleza contable heredada de la clase raíz */
  readonly nature: AccountNature;

  constructor(code: string, name: string, nature: AccountNature) {
    this.code = code;
    this.name = name;
    this.nature = nature;
  }

  /**
   * Devuelve el nombre del nivel jerárquico según la longitud del código.
   * Ejemplo: código "1105" (4 dígitos) → "cuenta"
   */
  get level(): string {
    return LEVEL_NAMES[this.code.length] ?? 'desconocido';
  }

  /**
   * Indica si esta cuenta es una clase (nivel raíz, 1 dígito).
   * Las clases son las únicas que definen su propia naturaleza.
   */
  get isClass(): boolean {
    return this.code.length === 1;
  }

  /**
   * Calcula el código del padre directo recortando el código actual
   * a la longitud del nivel anterior.
   * Ejemplo: "110505" → "1105", "1105" → "11", "11" → "1".
   * Retorna null si es una clase (no tiene padre).
   */
  getParentCode(): string | null {
    const parentLen = PARENT_LENGTH[this.code.length];
    if (parentLen === undefined) return null;
    return this.code.substring(0, parentLen);
  }

  /**
   * Valida que un string sea un código válido:
   * - Solo dígitos numéricos.
   * - Longitud exacta de 1, 2, 4 o 6.
   */
  static isValidCode(code: string): boolean {
    return /^\d+$/.test(code) && (VALID_LENGTHS as readonly number[]).includes(code.length);
  }

  /**
   * Devuelve las longitudes válidas de código.
   * Útil para mensajes de error descriptivos.
   */
  static getValidLengths(): readonly number[] {
    return VALID_LENGTHS;
  }

  /**
   * Dado un código válido, retorna el código del padre.
   * Versión estática para usar sin instanciar la entidad (ej: en validaciones).
   */
  static getParentCodeOf(code: string): string | null {
    const parentLen = PARENT_LENGTH[code.length];
    if (parentLen === undefined) return null;
    return code.substring(0, parentLen);
  }

  /**
   * Dado un código, retorna el nombre del nivel correspondiente.
   * Versión estática para uso en validaciones y respuestas.
   */
  static getLevelName(code: string): string {
    return LEVEL_NAMES[code.length] ?? 'desconocido';
  }
}

