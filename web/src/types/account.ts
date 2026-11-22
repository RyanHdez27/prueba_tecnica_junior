/**
 * Tipos de datos para el catálogo de cuentas en el Frontend.
 *
 * Coinciden exactamente con el contrato expuesto por la API REST
 * en GET /accounts/tree y POST /accounts.
 */

/** Naturaleza contable: débito o crédito */
export type AccountNature = 'debito' | 'credito';

/** Nivel jerárquico según la longitud del código */
export type AccountLevel = 'clase' | 'grupo' | 'cuenta' | 'subcuenta';

/**
 * Representación de un nodo en el árbol jerárquico.
 * Cada nodo contiene sus datos y una lista de hijos directos (`children`).
 */
export interface AccountNode {
  code: string;
  name: string;
  nature: AccountNature;
  level: AccountLevel | string;
  children: AccountNode[];
}

/** Datos requeridos para crear una nueva cuenta contable */
export interface CreateAccountInput {
  code: string;
  name: string;
  nature?: AccountNature;
}

/** Respuesta del servidor al crear una cuenta exitosamente */
export interface CreatedAccount {
  code: string;
  name: string;
  nature: AccountNature;
  level: string;
}

/** Error estructurado retornado por la API REST */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  field?: 'code' | 'name' | 'nature';
  error?: string;
}
