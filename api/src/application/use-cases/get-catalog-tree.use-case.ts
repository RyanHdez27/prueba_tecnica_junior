/**
 * GetCatalogTreeUseCase — Caso de uso: consultar el catálogo como árbol.
 *
 * Obtiene todas las cuentas del repositorio (lista plana) y las
 * organiza en una estructura jerárquica de nodos anidados.
 *
 * Algoritmo:
 *   1. Obtener todas las cuentas.
 *   2. Ordenar por longitud de código (padres primero) y luego por código.
 *   3. Crear un nodo por cada cuenta.
 *   4. Buscar el nodo padre y agregarlo como hijo.
 *   5. Retornar solo los nodos raíz (clases).
 *
 * Esta clase es TypeScript puro — NO depende de NestJS.
 */

import type { AccountNature } from '../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';

/**
 * Nodo del árbol que se devuelve al frontend.
 * Cada nodo contiene sus datos y un array de hijos anidados.
 */
export interface AccountTreeNode {
  /** Código numérico de la cuenta */
  code: string;
  /** Nombre descriptivo */
  name: string;
  /** Naturaleza heredada de la clase (débito o crédito) */
  nature: AccountNature;
  /** Nivel jerárquico: clase, grupo, cuenta o subcuenta */
  level: string;
  /** Cuentas hijas directas (siguiente nivel jerárquico) */
  children: AccountTreeNode[];
}

export class GetCatalogTreeUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Ejecuta la consulta y retorna el catálogo como un array de árboles.
   * Cada elemento del array es una clase (nivel raíz) con sus
   * descendientes anidados.
   *
   * Si el catálogo está vacío, retorna un array vacío.
   */
  execute(): AccountTreeNode[] {
    const accounts = this.accountRepository.findAll();

    /**
     * Ordenar por longitud de código primero (padres antes que hijos)
     * y luego por código para mantener orden numérico dentro del mismo nivel.
     * Esto garantiza que al procesar una cuenta, su padre ya esté en el mapa.
     */
    accounts.sort(
      (a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code),
    );

    /** Mapa de código → nodo del árbol, para encontrar padres en O(1) */
    const nodeMap = new Map<string, AccountTreeNode>();

    /** Array de nodos raíz (clases) que se retorna como resultado */
    const roots: AccountTreeNode[] = [];

    for (const account of accounts) {
      /* Crear el nodo del árbol para esta cuenta */
      const node: AccountTreeNode = {
        code: account.code,
        name: account.name,
        nature: account.nature,
        level: account.level,
        children: [],
      };

      /* Registrar en el mapa para que sus hijos lo encuentren después */
      nodeMap.set(account.code, node);

      const parentCode = account.getParentCode();

      if (parentCode === null) {
        /* Es una clase (1 dígito) → va directamente a la raíz */
        roots.push(node);
      } else {
        /**
         * Buscar el nodo padre en el mapa y agregar este nodo como hijo.
         * El padre siempre existe en el mapa porque ordenamos por longitud.
         */
        const parentNode = nodeMap.get(parentCode);
        if (parentNode) {
          parentNode.children.push(node);
        }
      }
    }

    return roots;
  }
}

