/**
 * Componente CreateAccountForm — Formulario para registrar una cuenta contable.
 *
 * Fases 4 y 6:
 * - Creación de clases raíz o creación de cuentas hijas desde un nodo padre existente.
 * - Validación cliente + servidor con mapeo a campos individuales.
 * - Restricción de prefijo cuando se crea como hija de un padre.
 */

import { useState } from 'react';
import type { AccountNature, AccountNode } from '../types/account';
import { createAccount, AccountApiError } from '../services/accountService';

interface CreateAccountFormProps {
  /** Se ejecuta al crear exitosamente la cuenta (para recargar el árbol) */
  onSuccess: (code: string) => void;
  /** Permite cerrar o cancelar el formulario */
  onCancel?: () => void;
  /** Cuenta padre opcional desde la que se origina esta nueva cuenta (Fase 6) */
  parentAccount?: AccountNode | null;
}

interface FieldErrors {
  code?: string;
  name?: string;
  nature?: string;
}

const VALID_LENGTHS = [1, 2, 4, 6];

function getLevelName(length: number): string | null {
  switch (length) {
    case 1:
      return 'Clase';
    case 2:
      return 'Grupo';
    case 4:
      return 'Cuenta';
    case 6:
      return 'Subcuenta';
    default:
      return null;
  }
}

/** Retorna la longitud esperada para el hijo según la longitud del padre */
function getExpectedChildLength(parentLength: number): number | null {
  switch (parentLength) {
    case 1:
      return 2; // Hijo de Clase (1) es Grupo (2)
    case 2:
      return 4; // Hijo de Grupo (2) es Cuenta (4)
    case 4:
      return 6; // Hijo de Cuenta (4) es Subcuenta (6)
    default:
      return null;
  }
}

export function CreateAccountForm({
  onSuccess,
  onCancel,
  parentAccount,
}: CreateAccountFormProps) {
  const [code, setCode] = useState(parentAccount ? parentAccount.code : '');
  const [name, setName] = useState('');
  const [nature, setNature] = useState<AccountNature | ''>('debito');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const cleanCode = code.trim();
  const isClass = !parentAccount && cleanCode.length === 1;
  const detectedLevel = getLevelName(cleanCode.length);
  const expectedChildLength = parentAccount
    ? getExpectedChildLength(parentAccount.code.length)
    : null;

  /** Validación en el cliente */
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Validar código
    if (!cleanCode) {
      errors.code = 'El código es obligatorio.';
    } else if (!/^\d+$/.test(cleanCode)) {
      errors.code = 'El código debe contener solo dígitos numéricos.';
    } else if (!VALID_LENGTHS.includes(cleanCode.length)) {
      errors.code = `Longitud inválida (${cleanCode.length} dígitos). Debe tener 1, 2, 4 o 6 dígitos.`;
    } else if (parentAccount) {
      // Si se crea como hija, debe comenzar con el código del padre
      if (!cleanCode.startsWith(parentAccount.code)) {
        errors.code = `El código debe comenzar con "${parentAccount.code}" (código del padre).`;
      } else if (
        expectedChildLength !== null &&
        cleanCode.length !== expectedChildLength
      ) {
        errors.code = `Como hija de ${parentAccount.code} (${parentAccount.level}), debe tener exactamente ${expectedChildLength} dígitos.`;
      }
    }

    // Validar nombre
    if (!name.trim()) {
      errors.name = 'El nombre es obligatorio.';
    }

    // Validar naturaleza condicional
    if (isClass && !nature) {
      errors.nature = 'La naturaleza es obligatoria para cuentas de nivel clase.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createAccount({
        code: cleanCode,
        name: name.trim(),
        nature: isClass ? (nature as AccountNature) : undefined,
      });

      setCode('');
      setName('');
      setFieldErrors({});
      onSuccess(cleanCode);
    } catch (err) {
      if (err instanceof AccountApiError && err.field) {
        setFieldErrors((prev) => ({
          ...prev,
          [err.field!]: err.message,
        }));
      } else {
        setGeneralError(
          err instanceof Error
            ? err.message
            : 'Error inesperado al crear la cuenta',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="account-form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <div>
          <h3>
            {parentAccount
              ? `Crear Subcuenta para ${parentAccount.code}`
              : 'Registrar Nueva Cuenta Contable'}
          </h3>
          {parentAccount && (
            <p className="form-header-subtitle">
              Padre: <strong>{parentAccount.code} - {parentAccount.name}</strong> ({parentAccount.level})
            </p>
          )}
        </div>
        {onCancel && (
          <button
            type="button"
            className="btn-close-form"
            onClick={onCancel}
            aria-label="Cerrar formulario"
          >
            ✕
          </button>
        )}
      </div>

      {generalError && (
        <div className="form-alert error-banner" role="alert">
          {generalError}
        </div>
      )}

      {/* Contexto del padre cuando se crea desde nodo */}
      {parentAccount && (
        <div className="form-parent-context">
          <span className="info-icon">↳</span>
          <div>
            Creando cuenta dependiente de nivel{' '}
            <strong>{getLevelName(expectedChildLength ?? 2)}</strong>. Debe tener{' '}
            <strong>{expectedChildLength} dígitos</strong> y comenzar con{' '}
            <code>{parentAccount.code}</code>.
          </div>
        </div>
      )}

      {/* Campo: Código */}
      <div className="form-group">
        <label htmlFor="account-code">
          Código numérico <span className="required">*</span>
        </label>
        <div className="input-with-indicator">
          <input
            id="account-code"
            type="text"
            inputMode="numeric"
            placeholder={
              parentAccount
                ? `Ej: ${parentAccount.code}${expectedChildLength === 2 ? '1' : '01'}`
                : 'Ej: 1, 11, 1105 o 110505'
            }
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (fieldErrors.code) {
                setFieldErrors((prev) => ({ ...prev, code: undefined }));
              }
            }}
            disabled={isSubmitting}
            className={fieldErrors.code ? 'input-error' : ''}
            autoFocus
          />
          {cleanCode.length > 0 && (
            <span
              className={`level-indicator ${
                detectedLevel ? 'indicator-valid' : 'indicator-invalid'
              }`}
            >
              {detectedLevel
                ? `${detectedLevel} (${cleanCode.length}d)`
                : `${cleanCode.length} dígitos`}
            </span>
          )}
        </div>
        {fieldErrors.code ? (
          <p className="field-error-msg">{fieldErrors.code}</p>
        ) : (
          <p className="field-hint">
            {parentAccount && expectedChildLength
              ? `Escribe los dígitos restantes para completar los ${expectedChildLength} dígitos requeridos.`
              : 'Longitudes permitidas: 1 (clase), 2 (grupo), 4 (cuenta), 6 (subcuenta).'}
          </p>
        )}
      </div>

      {/* Campo: Nombre */}
      <div className="form-group">
        <label htmlFor="account-name">
          Nombre de la cuenta <span className="required">*</span>
        </label>
        <input
          id="account-name"
          type="text"
          placeholder="Ej: Caja general, Disponible, Bancos"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldErrors.name) {
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
          disabled={isSubmitting}
          className={fieldErrors.name ? 'input-error' : ''}
        />
        {fieldErrors.name && (
          <p className="field-error-msg">{fieldErrors.name}</p>
        )}
      </div>

      {/* Campo condicional: Naturaleza */}
      {isClass ? (
        <div className="form-group">
          <label htmlFor="account-nature">
            Naturaleza contable <span className="required">*</span>
          </label>
          <select
            id="account-nature"
            value={nature}
            onChange={(e) => {
              setNature(e.target.value as AccountNature);
              if (fieldErrors.nature) {
                setFieldErrors((prev) => ({ ...prev, nature: undefined }));
              }
            }}
            disabled={isSubmitting}
            className={fieldErrors.nature ? 'input-error' : ''}
          >
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </select>
          {fieldErrors.nature ? (
            <p className="field-error-msg">{fieldErrors.nature}</p>
          ) : (
            <p className="field-hint">
              Las clases raíz definen la naturaleza que heredarán todos sus descendientes.
            </p>
          )}
        </div>
      ) : cleanCode.length > 1 ? (
        <div className="form-group-info">
          <span className="info-icon">ℹ️</span>
          <span className="info-text">
            Naturaleza:{' '}
            <strong>
              {parentAccount ? parentAccount.nature : 'Se heredará de la clase'}
            </strong>{' '}
            (heredada automáticamente del ancestro raíz).
          </span>
        </div>
      ) : null}

      {/* Botones de acción */}
      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting
            ? 'Guardando...'
            : parentAccount
              ? 'Crear Cuenta Hija'
              : 'Crear Cuenta'}
        </button>
      </div>
    </form>
  );
}
