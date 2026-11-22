/**
 * Aplicación principal — Catálogo Contable.
 *
 * Fases 3 a 6:
 * - Árbol jerárquico interactivo con búsqueda y expandir/colapsar todo.
 * - Destacado de nivel y naturaleza contable en todo el catálogo.
 * - Creación de cuentas independientes o creación de hijas directamente desde un nodo.
 * - Eliminación con confirmación modal y protección contra borrado de cuentas con hijas.
 */

import { useEffect, useState } from 'react';
import type { AccountNode } from './types/account';
import { fetchCatalogTree } from './services/accountService';
import { AccountTree } from './components/AccountTree';
import { CreateAccountForm } from './components/CreateAccountForm';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export function App() {
  const [accounts, setAccounts] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Control de formulario de creación y cuenta padre (Fase 6)
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [parentForNewChild, setParentForNewChild] = useState<AccountNode | null>(null);

  // Control de modal de eliminación (Fase 5)
  const [accountToDelete, setAccountToDelete] = useState<AccountNode | null>(null);

  // Mensaje de éxito temporal
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /** Carga o recarga del catálogo desde la API */
  const reloadAccounts = () => {
    setLoading(true);
    setError(null);
    fetchCatalogTree()
      .then((data) => {
        setAccounts(data);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Error desconocido al cargar cuentas';
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  /** Carga inicial al montar */
  useEffect(() => {
    let active = true;

    fetchCatalogTree()
      .then((data) => {
        if (active) {
          setAccounts(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const message = err instanceof Error ? err.message : 'Error desconocido al cargar cuentas';
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const triggerSuccessAlert = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  const handleAccountCreated = (newCode: string) => {
    const parentMsg = parentForNewChild
      ? ` como subcuenta de "${parentForNewChild.code}"`
      : '';
    triggerSuccessAlert(`Cuenta "${newCode}" creada exitosamente${parentMsg}.`);
    setShowCreateForm(false);
    setParentForNewChild(null);
    reloadAccounts();
  };

  const handleDeleteSuccess = (deletedCode: string, deletedName: string) => {
    triggerSuccessAlert(`Cuenta "${deletedCode} - ${deletedName}" eliminada correctamente.`);
    setAccountToDelete(null);
    reloadAccounts();
  };

  /** Inicia el flujo de creación de cuenta hija desde un nodo (Fase 6) */
  const handleAddChildFromNode = (parent: AccountNode) => {
    setParentForNewChild(parent);
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1>Catálogo de Cuentas Contables</h1>
            <p className="app-subtitle">
              Estructura jerárquica conforme al Plan Único de Cuentas (PUC)
            </p>
          </div>
          <button
            type="button"
            className="btn-primary btn-add-account"
            onClick={() => {
              if (showCreateForm) {
                setShowCreateForm(false);
                setParentForNewChild(null);
              } else {
                setParentForNewChild(null);
                setShowCreateForm(true);
              }
            }}
          >
            {showCreateForm ? 'Cerrar Formulario' : '+ Nueva Cuenta'}
          </button>
        </div>
      </header>

      {/* Banner de éxito */}
      {successMessage && (
        <div className="alert-banner alert-success" role="status">
          <span>✓ {successMessage}</span>
          <button
            type="button"
            className="btn-close-alert"
            onClick={() => setSuccessMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulario de creación (Fase 4 y Fase 6) */}
      {showCreateForm && (
        <section className="form-section">
          <CreateAccountForm
            key={parentForNewChild ? parentForNewChild.code : 'root-form'}
            parentAccount={parentForNewChild}
            onSuccess={handleAccountCreated}
            onCancel={() => {
              setShowCreateForm(false);
              setParentForNewChild(null);
            }}
          />
        </section>
      )}

      {/* Árbol jerárquico (Fases 3, 5 y 6) */}
      <main className="app-main">
        <AccountTree
          accounts={accounts}
          loading={loading}
          error={error}
          onRetry={reloadAccounts}
          onDeleteAccount={(node) => setAccountToDelete(node)}
          onAddChildAccount={handleAddChildFromNode}
        />
      </main>

      {/* Modal de confirmación de eliminación (Fase 5) */}
      {accountToDelete && (
        <DeleteConfirmModal
          key={accountToDelete.code}
          account={accountToDelete}
          onClose={() => setAccountToDelete(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}

export default App;
