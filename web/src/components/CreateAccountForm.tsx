/**
 * Componente CreateAccountForm — Formulario para registrar una cuenta contable.
 *
 * Fase 4: Frontend crear cuenta.
 *
 * Características:
 *   - Validación en el cliente en tiempo real y al enviar (código numérico, longitud válida, campos requeridos).
 *   - Detección visual y dinámica del nivel jerárquico según la longitud del código.
 *   - Selector de naturaleza condicional (solo visible/requerido para clases de 1 dígito; para los demás niveles se hereda).
 *   - Mapeo específico de errores del servidor (`field: 'code' | 'name' | 'nature'`) directamente bajo el input causante.
 *   - Soporte para prellenar código (útil para la Fase 6 "crear hija desde nodo").
 */

import { useState } from 'react';
import type { AccountNature } from '../types/account';
import { createAccount, AccountApiError } from '../services/accountService';

interface CreateAccountFormProps {
  /** Se ejecuta al crear exitosamente la cuenta (para recargar el árbol) */
  onSuccess: (code: string) => void;
  /** Permite cerrar o cancelar el formulario */
  onCancel?: () => void;
  /** Código inicial opcional (para crear hijas directamente desde un nodo) */
  initialCode?: string;
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

export function CreateAccountForm({
  onSuccess,
  onCancel,
  initialCode = '',
}: CreateAccountFormProps) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [nature, setNature] = useState<AccountNature | ''>('debito');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const cleanCode = code.trim();
  const isClass = cleanCode.length === 1;
  const detectedLevel = getLevelName(cleanCode.length);

  /** Validación en el cliente antes de enviar la petición */
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    // Validar código
    if (!cleanCode) {
      errors.code = 'El código es obligatorio.';
    } else if (!/^\d+$/.test(cleanCode)) {
      errors.code = 'El código debe contener solo dígitos numéricos.';
    } else if (!VALID_LENGTHS.includes(cleanCode.length)) {
      errors.code = `Longitud inválida (${cleanCode.length} dígitos). Debe tener 1, 2, 4 o 6 dígitos.`;
    }

    // Validar nombre
    if (!name.trim()) {
      errors.name = 'El nombre es obligatorio.';
    }

    // Validar naturaleza condicional (solo obligatoria en nivel clase)
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

      // Limpiar formulario y notificar éxito
      setCode('');
      setName('');
      setFieldErrors({});
      onSuccess(cleanCode);
    } catch (err) {
      if (err instanceof AccountApiError && err.field) {
        // Error de negocio específico asignado al input causante
        setFieldErrors((prev) => ({
          ...prev,
          [err.field!]: err.message,
        }));
      } else {
        // Error general de servidor o de red
        setGeneralError(
          err instanceof Error ? err.message : 'Error inesperado al crear la cuenta',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="account-form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-header">
        <h3>Registrar Nueva Cuenta Contable</h3>
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
            placeholder="Ej: 1, 11, 1105 o 110505"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (fieldErrors.code) {
                setFieldErrors((prev) => ({ ...prev, code: undefined }));
              }
            }}
            disabled={isSubmitting}
            className={fieldErrors.code ? 'input-error' : ''}
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
            Longitudes permitidas: 1 (clase), 2 (grupo), 4 (cuenta), 6 (subcuenta).
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
            La naturaleza será heredada automáticamente de la clase raíz (código{' '}
            <strong>{cleanCode[0]}</strong>).
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
          {isSubmitting ? 'Guardando...' : 'Crear Cuenta'}
        </button>
      </div>
    </form>
  );
}
