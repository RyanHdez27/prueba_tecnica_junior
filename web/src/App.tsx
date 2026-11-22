/**
 * Aplicación principal — Catálogo Contable.
 *
 * Fases 3, 4 y 5:
 * - Consulta y visualización del árbol jerárquico.
 * - Registro de nuevas cuentas con validación cliente + servidor.
 * - Eliminación de cuentas con confirmación modal y control de error de dependencias.
 * - Soporte preparado para creación de hijas desde nodo (Fase 6).
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

  // Control de formulario de creación
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [formInitialCode, setFormInitialCode] = useState<string>('');

  // Control de modal de eliminación
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
    triggerSuccessAlert(`Cuenta con código "${newCode}" creada exitosamente.`);
    setShowCreateForm(false);
    setFormInitialCode('');
    reloadAccounts();
  };

  const handleDeleteSuccess = (deletedCode: string, deletedName: string) => {
    triggerSuccessAlert(`Cuenta "${deletedCode} - ${deletedName}" eliminada correctamente.`);
    setAccountToDelete(null);
    reloadAccounts();
  };

  const handleAddChildFromNode = (parentCode: string) => {
    setFormInitialCode(parentCode);
    setShowCreateForm(true);
    // Scroll suave hacia el formulario
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
                setFormInitialCode('');
              } else {
                setFormInitialCode('');
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
            initialCode={formInitialCode}
            onSuccess={handleAccountCreated}
            onCancel={() => {
              setShowCreateForm(false);
              setFormInitialCode('');
            }}
          />
        </section>
      )}

      {/* Árbol jerárquico (Fases 3 y 5) */}
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
