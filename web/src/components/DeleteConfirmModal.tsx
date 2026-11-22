/**
 * Modal de confirmación para eliminar una cuenta contable.
 *
 * Fase 5: Frontend eliminar cuenta.
 *
 * Características:
 *   - Confirmación previa antes de ejecutar la eliminación física.
 *   - Alerta visual preventiva si la cuenta posee subcuentas dependientes.
 *   - Presentación de errores del servidor (ej: 409 Conflict si tiene hijas).
 *   - Manejo de estados de carga ("Eliminando...").
 *   - Cierre con tecla Escape o clic en el backdrop.
 */

import { useEffect, useState } from 'react';
import type { AccountNode } from '../types/account';
import { deleteAccount } from '../services/accountService';

interface DeleteConfirmModalProps {
  /** Cuenta que se desea eliminar (null si el modal está cerrado) */
  account: AccountNode | null;
  /** Callback al cerrar o cancelar el modal */
  onClose: () => void;
  /** Callback al eliminar exitosamente la cuenta (para recargar el árbol) */
  onSuccess: (deletedCode: string, deletedName: string) => void;
}

export function DeleteConfirmModal({
  account,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cierre con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onClose]);

  if (!account) return null;

  const hasChildren = account.children && account.children.length > 0;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteAccount(account.code);
      onSuccess(account.code, account.name);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al eliminar la cuenta.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title text-danger">
            Confirmar Eliminación
          </h3>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p>
            ¿Estás seguro de que deseas eliminar la cuenta{' '}
            <strong>
              {account.code} - {account.name}
            </strong>
            ?
          </p>

          {hasChildren && (
            <div className="modal-warning-box">
              <span className="warning-icon">⚠️</span>
              <div>
                <strong>Atención:</strong> Esta cuenta tiene{' '}
                {account.children.length}{' '}
                {account.children.length === 1
                  ? 'cuenta hija dependiente'
                  : 'cuentas hijas dependientes'}
                . Por regla contable, no podrá ser eliminada hasta que todas sus
                hijas sean eliminadas previamente.
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="form-alert error-banner" role="alert">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Sí, eliminar cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
