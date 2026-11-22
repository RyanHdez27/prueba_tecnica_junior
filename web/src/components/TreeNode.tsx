/**
 * Componente recursivo TreeNode.
 *
 * Responsabilidad:
 *   - Renderizar un nodo individual del árbol contable con su código, nombre, nivel y naturaleza.
 *   - Manejar el estado local de expandido/colapsado (expand/collapse).
 *   - Renderizar recursivamente a sus hijos en `node.children` respetando la jerarquía visual.
 *   - Exponer botones de acción: eliminar cuenta (Fase 5) y crear cuenta hija (Fase 6).
 */

import { useState } from 'react';
import type { AccountNode } from '../types/account';

interface TreeNodeProps {
  /** Nodo de cuenta a renderizar */
  node: AccountNode;
  /** Nivel de profundidad en el árbol (0 para clases raíz) */
  depth?: number;
  /** Callback para solicitar la eliminación de una cuenta */
  onDelete?: (node: AccountNode) => void;
  /** Callback para crear una cuenta hija desde este nodo (Fase 6) */
  onAddChild?: (parentCode: string) => void;
}

export function TreeNode({
  node,
  depth = 0,
  onDelete,
  onAddChild,
}: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;

  // Por defecto, mantenemos abiertas las clases principales (depth === 0)
  const [isExpanded, setIsExpanded] = useState(depth === 0);

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded((prev) => !prev);
    }
  };

  const isDebito = node.nature === 'debito';

  // Subcuentas (6 dígitos) no admiten hijos según la regla contable
  const canHaveChildren = node.code.length < 6;

  return (
    <div className="tree-node" style={{ '--depth': depth } as React.CSSProperties}>
      <div
        className={`tree-node-row ${hasChildren ? 'has-children' : 'is-leaf'}`}
        onClick={toggleExpand}
        role={hasChildren ? 'button' : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onKeyDown={(e) => {
          if (hasChildren && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleExpand();
          }
        }}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {/* Indicador de expand/collapse */}
        <span className="tree-node-toggle" aria-hidden="true">
          {hasChildren ? (
            <span className={`toggle-icon ${isExpanded ? 'expanded' : 'collapsed'}`}>
              ▼
            </span>
          ) : (
            <span className="leaf-bullet">•</span>
          )}
        </span>

        {/* Código contable */}
        <span className="tree-node-code">{node.code}</span>

        {/* Nombre descriptivo */}
        <span className="tree-node-name">{node.name}</span>

        {/* Badges de Nivel y Naturaleza */}
        <div className="tree-node-badges">
          <span className={`badge badge-level level-${node.level}`}>
            {node.level}
          </span>
          <span
            className={`badge badge-nature ${
              isDebito ? 'nature-debito' : 'nature-credito'
            }`}
          >
            {node.nature}
          </span>
        </div>

        {/* Botones de acción del nodo */}
        <div className="tree-node-actions" onClick={(e) => e.stopPropagation()}>
          {onAddChild && canHaveChildren && (
            <button
              type="button"
              className="btn-node-action btn-add-child"
              title={`Crear subcuenta dependiente de ${node.code}`}
              onClick={() => onAddChild(node.code)}
              aria-label={`Crear subcuenta para ${node.code}`}
            >
              + Hija
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              className="btn-node-action btn-delete-node"
              title={
                hasChildren
                  ? `Eliminar cuenta ${node.code} (atención: tiene hijas)`
                  : `Eliminar cuenta ${node.code}`
              }
              onClick={() => onDelete(node)}
              aria-label={`Eliminar cuenta ${node.code}`}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Renderizado recursivo de hijos */}
      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.code}
              node={child}
              depth={depth + 1}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
