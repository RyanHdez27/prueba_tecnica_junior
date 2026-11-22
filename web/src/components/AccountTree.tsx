/**
 * Componente contenedor AccountTree.
 *
 * Fases 3 y 6:
 * - Renderiza el árbol contable jerárquico.
 * - Toolbar interactiva: búsqueda en tiempo real, Expandir Todo y Colapsar Todo.
 * - Resumen visual de naturaleza contable (total débito vs crédito).
 * - Auto-expansión inteligente de nodos ancestros al buscar.
 */

import { useMemo, useState } from 'react';
import type { AccountNode } from '../types/account';
import { TreeNode } from './TreeNode';

interface AccountTreeProps {
  /** Lista de cuentas raíz (clases) con sus árboles anidados */
  accounts: AccountNode[];
  /** Indica si la consulta HTTP está en curso */
  loading: boolean;
  /** Mensaje de error si la petición falló */
  error: string | null;
  /** Función para reintentar la carga */
  onRetry: () => void;
  /** Callback para eliminar una cuenta (Fase 5) */
  onDeleteAccount?: (node: AccountNode) => void;
  /** Callback para crear una cuenta hija (Fase 6) */
  onAddChildAccount?: (parent: AccountNode) => void;
}

/** Recolecta todos los códigos de nodos que poseen hijos */
function collectParentCodes(nodes: AccountNode[]): string[] {
  const codes: string[] = [];
  function traverse(list: AccountNode[]) {
    for (const node of list) {
      if (node.children && node.children.length > 0) {
        codes.push(node.code);
        traverse(node.children);
      }
    }
  }
  traverse(nodes);
  return codes;
}

/** Calcula estadísticas de cuentas y naturalezas */
function calculateStats(nodes: AccountNode[]) {
  let total = 0;
  let debitos = 0;
  let creditos = 0;

  function traverse(list: AccountNode[]) {
    for (const node of list) {
      total++;
      if (node.nature === 'debito') debitos++;
      else creditos++;
      if (node.children) traverse(node.children);
    }
  }
  traverse(nodes);
  return { total, debitos, creditos };
}

/** Encuentra todos los ancestros de nodos que coinciden con la búsqueda para auto-expandirlos */
function findAncestorCodesToExpand(
  nodes: AccountNode[],
  query: string,
): Set<string> {
  const toExpand = new Set<string>();
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return toExpand;

  function traverse(node: AccountNode, path: string[]): boolean {
    const matchesSelf =
      node.code.toLowerCase().includes(cleanQuery) ||
      node.name.toLowerCase().includes(cleanQuery);

    let childMatched = false;
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (traverse(child, [...path, node.code])) {
          childMatched = true;
        }
      }
    }

    if (matchesSelf || childMatched) {
      path.forEach((code) => toExpand.add(code));
      return true;
    }

    return false;
  }

  for (const root of nodes) {
    traverse(root, []);
  }

  return toExpand;
}

export function AccountTree({
  accounts,
  loading,
  error,
  onRetry,
  onDeleteAccount,
  onAddChildAccount,
}: AccountTreeProps) {
  // Estado de búsqueda en vivo
  const [searchQuery, setSearchQuery] = useState('');

  // Conjunto de códigos expandidos
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => {
    // Por defecto, clases raíz expandidas
    return new Set(accounts.map((a) => a.code));
  });

  // Estadísticas del catálogo
  const stats = useMemo(() => calculateStats(accounts), [accounts]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const ancestors = findAncestorCodesToExpand(accounts, query);
      setExpandedCodes((prev) => {
        const next = new Set(prev);
        ancestors.forEach((c) => next.add(c));
        return next;
      });
    }
  };

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allParents = collectParentCodes(accounts);
    setExpandedCodes(new Set(allParents));
  };

  const handleCollapseAll = () => {
    setExpandedCodes(new Set());
  };

  if (loading) {
    return (
      <div className="tree-status-box loading">
        <div className="spinner" />
        <p>Cargando catálogo contable...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tree-status-box error">
        <p className="error-title">⚠️ No se pudo cargar el catálogo</p>
        <p className="error-detail">{error}</p>
        <button className="btn-retry" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="tree-status-box empty">
        <p className="empty-title">El catálogo está vacío</p>
        <p className="empty-hint">Aún no se han registrado cuentas contables.</p>
      </div>
    );
  }

  return (
    <div className="account-tree-container">
      {/* Encabezado con estadísticas y controles */}
      <div className="tree-header">
        <div>
          <h2>Catálogo de Cuentas</h2>
          <div className="tree-stats-row">
            <span className="stat-pill">
              <strong>{stats.total}</strong> cuentas totales
            </span>
            <span className="stat-pill stat-debito">
              <strong>{stats.debitos}</strong> débito
            </span>
            <span className="stat-pill stat-credito">
              <strong>{stats.creditos}</strong> crédito
            </span>
          </div>
        </div>

        {/* Acciones de expandir/colapsar todo */}
        <div className="tree-header-actions">
          <button
            type="button"
            className="btn-tree-toggle"
            onClick={handleExpandAll}
            title="Expandir todas las cuentas"
          >
            Expandir todo
          </button>
          <button
            type="button"
            className="btn-tree-toggle"
            onClick={handleCollapseAll}
            title="Colapsar todas las cuentas"
          >
            Colapsar todo
          </button>
        </div>
      </div>

      {/* Barra de búsqueda en tiempo real */}
      <div className="tree-search-bar">
        <input
          type="search"
          placeholder="Buscar por código (ej: 1105) o por nombre (ej: Caja)..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="search-input"
          aria-label="Buscar cuentas"
        />
        {searchQuery && (
          <button
            type="button"
            className="btn-clear-search"
            onClick={() => handleSearchChange('')}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* Lista del árbol */}
      <div className="tree-list">
        {accounts.map((rootAccount) => (
          <TreeNode
            key={rootAccount.code}
            node={rootAccount}
            depth={0}
            expandedCodes={expandedCodes}
            onToggleExpand={toggleExpand}
            onDelete={onDeleteAccount}
            onAddChild={onAddChildAccount}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}
