/**
 * Servicio de comunicación HTTP con la API de cuentas.
 *
 * Encapsula las peticiones fetch, validación de status HTTP y deserialización JSON.
 * Centraliza las llamadas para facilitar mantenimiento, pruebas y manejo de errores.
 */

import { apiUrl } from '../api';
import type {
  AccountNode,
  CreateAccountInput,
  CreatedAccount,
  ApiErrorResponse,
} from '../types/account';

/** Error enriquecido con información de campo retornado por el backend */
export class AccountApiError extends Error {
  readonly field?: 'code' | 'name' | 'nature';
  readonly statusCode: number;

  constructor(message: string, statusCode: number, field?: 'code' | 'name' | 'nature') {
    super(message);
    this.name = 'AccountApiError';
    this.statusCode = statusCode;
    this.field = field;
  }
}

/**
 * Consulta el catálogo contable completo estructurado como árbol jerárquico.
 * Llama al endpoint GET /accounts/tree.
 *
 * @throws Error con mensaje legible si la API responde con error o falla la red.
 */
export async function fetchCatalogTree(): Promise<AccountNode[]> {
  const response = await fetch(apiUrl('/accounts/tree'));

  if (!response.ok) {
    let errorMessage = `Error del servidor (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        errorMessage = Array.isArray(errorBody.message)
          ? errorBody.message.join(', ')
          : errorBody.message;
      }
    } catch {
      // Si la respuesta no es JSON válido, usamos el status general
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Crea una nueva cuenta contable enviando POST a /accounts.
 *
 * @param input Datos de la cuenta (code, name, nature opcional)
 * @throws AccountApiError con el campo causante (field) si el backend rechaza la petición.
 */
export async function createAccount(input: CreateAccountInput): Promise<CreatedAccount> {
  const response = await fetch(apiUrl('/accounts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Respuesta no es JSON
    }

    let message = 'Error al crear la cuenta.';
    if (errorData?.message) {
      message = Array.isArray(errorData.message)
        ? errorData.message.join('. ')
        : errorData.message;
    } else {
      message = `Error HTTP ${response.status}`;
    }

    throw new AccountApiError(message, response.status, errorData?.field);
  }

  return response.json();
}

/**
 * Elimina una cuenta contable por su código enviando DELETE a /accounts/:code.
 *
 * @param code Código único de la cuenta a eliminar
 * @throws AccountApiError si la cuenta tiene hijas (409 Conflict) o no existe (404 Not Found).
 */
export async function deleteAccount(code: string): Promise<void> {
  const response = await fetch(apiUrl(`/accounts/${encodeURIComponent(code)}`), {
    method: 'DELETE',
  });

  if (!response.ok) {
    let message = 'Error al eliminar la cuenta.';
    try {
      const errorData: ApiErrorResponse = await response.json();
      if (errorData?.message) {
        message = Array.isArray(errorData.message)
          ? errorData.message.join('. ')
          : errorData.message;
      }
    } catch {
      message = `Error HTTP ${response.status}`;
    }

    throw new AccountApiError(message, response.status);
  }
}
