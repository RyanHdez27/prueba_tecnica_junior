/**
 * Componente contenedor AccountTree.
 *
 * Responsabilidad:
 *   - Mostrar el catálogo completo de cuentas organizado jerárquicamente.
 *   - Manejar estados de carga, error y catálogo vacío con mensajes amigables y reintento.
 *   - Propagar las acciones de eliminación y creación de hijas a los nodos.
 */

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
  onAddChildAccount?: (parentCode: string) => void;
}

export function AccountTree({
  accounts,
  loading,
  error,
  onRetry,
  onDeleteAccount,
  onAddChildAccount,
}: AccountTreeProps) {
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
      <div className="tree-header">
        <h2>Catálogo de Cuentas</h2>
        <span className="account-count">
          {accounts.length} {accounts.length === 1 ? 'clase raíz' : 'clases raíz'}
        </span>
      </div>

      <div className="tree-list">
        {accounts.map((rootAccount) => (
          <TreeNode
            key={rootAccount.code}
            node={rootAccount}
            depth={0}
            onDelete={onDeleteAccount}
            onAddChild={onAddChildAccount}
          />
        ))}
      </div>
    </div>
  );
}
