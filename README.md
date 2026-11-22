# Catálogo de Cuentas Contables — Prueba Técnica Full-Stack

Aplicación full-stack para la gestión del catálogo contable según las normas del **Plan Único de Cuentas (PUC)**. Permite consultar la estructura jerárquica en forma de árbol interactivo, registrar nuevas cuentas con validaciones estrictas de negocio y eliminar cuentas garantizando la integridad referencial.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías | Características Clave |
|------|-------------|-----------------------|
| **Backend (`api/`)** | NestJS, TypeScript, Node.js 22, Vitest, oxlint | Clean Architecture, Inversión de Dependencias, DTOs con `class-validator`, Persistencia en Memoria con respaldo en JSON |
| **Frontend (`web/`)** | React 19, TypeScript, Vite, CSS moderno | Componente recursivo `TreeNode`, búsqueda reactiva, auto-expansión, validación client + server errors, modo claro/oscuro |

---

## 🚀 Cómo Correr el Proyecto

### Requisitos previos
- **Node.js 22** (disponible en `.nvmrc`, ejecutar `nvm use` si utilizas nvm).
- **npm 10** o superior.

### Instalación de dependencias
Desde la raíz del repositorio, ejecuta:
```bash
npm install
```
*(Este comando instala automáticamente las dependencias de la raíz, de `api/` y de `web/`).*

### Levantar en modo desarrollo
Para ejecutar tanto la API como el Frontend simultáneamente:
```bash
npm run dev
```

Una vez levantado:
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3000](http://localhost:3000)

El proyecto incluye datos semilla iniciales cargados en `api/data/catalog.json` con cuentas contables reales de las clases 1 (Activo), 2 (Pasivo), 3 (Patrimonio), 4 (Ingresos) y 5 (Gastos), por lo que verás el árbol poblado de inmediato al abrir la aplicación.

---

## 📋 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia la API y el Frontend a la vez en modo watch |
| `npm run dev:api` | Inicia únicamente la API de NestJS |
| `npm run dev:web` | Inicia únicamente el Frontend de Vite |
| `npm run build` | Compila ambos proyectos (NestJS + Vite) |
| `npm test` | Ejecuta las pruebas automatizadas de casos de uso y controller con Vitest |
| `npm run lint` | Ejecuta el análisis estático de código ultrarrápido con oxlint |

---

## 🏛️ Arquitectura del Sistema

### 1. Backend: Clean Architecture / DDD
El backend se estructuró en capas concéntricas desacopladas del framework:

```
api/src/
├── domain/                      # Capa de Dominio (TypeScript puro, 0 dependencias)
│   ├── entities/
│   │   └── account.entity.ts    # Entidad Account, cálculo de nivel, longitudes y padre
│   ├── errors/
│   │   └── domain-errors.ts     # Errores semánticos de negocio
│   └── repositories/
│       └── account.repository.ts# Contrato del repositorio (interfaz)
├── application/                 # Capa de Casos de Uso (TypeScript puro)
│   └── use-cases/
│       ├── create-account.use-case.ts    # Creación, validaciones y herencia
│       ├── get-catalog-tree.use-case.ts  # Armado jerárquico del árbol
│       └── delete-account.use-case.ts    # Eliminación con validación de hijas
├── infrastructure/              # Capa de Infraestructura
│   └── persistence/
│       └── in-memory-account.repository.ts # Map O(1) con respaldo atómico en catalog.json
└── accounts/                    # Capa de Adaptadores HTTP (NestJS)
    ├── dto/
    │   └── create-account.dto.ts         # Validación sintáctica HTTP (class-validator)
    ├── accounts.controller.ts            # Endpoints REST y mapeo de errores HTTP con `field`
    └── accounts.module.ts                # Inversión de dependencias mediante factories
```

**Principios aplicados:**
- **Inversión de Dependencias (DIP):** Los casos de uso dependen exclusivamente de la interfaz `AccountRepository`. Si se desea migrar a PostgreSQL, solo se crea una nueva clase en infraestructura y se actualiza el factory en `accounts.module.ts`, dejando intactos dominio y casos de uso.
- **Separación de responsabilidades:** La validación de forma (tipos de datos, cadenas no vacías) se gestiona en el DTO con `ValidationPipe`; las reglas contables (longitudes 1/2/4/6, existencia de padre, duplicidad, herencia) residen en el caso de uso.

### 2. Frontend: Componentes Modulares y Reactivos
El frontend en React 19 está organizado en módulos reutilizables:

```
web/src/
├── types/
│   └── account.ts              # Contratos TypeScript sincronizados con la API
├── services/
│   └── accountService.ts       # Capa de transporte fetch y clase de error AccountApiError
├── components/
│   ├── TreeNode.tsx            # Nodo recursivo con expand/collapse, badges y acciones
│   ├── AccountTree.tsx         # Contenedor con búsqueda en tiempo real, toolbar y estadísticas
│   ├── CreateAccountForm.tsx   # Formulario con validación en cliente y servidor
│   └── DeleteConfirmModal.tsx  # Modal de confirmación y advertencia de dependencias
├── App.tsx                     # Orquestador principal de estado y alertas
└── index.css                   # Sistema de diseño con CSS variables y tema claro/oscuro
```

---

## 💼 Reglas de Negocio Contables Implementadas

1. **Jerarquía del PUC:**
   - **Clase (1 dígito):** Raíz del catálogo contable.
   - **Grupo (2 dígitos):** Requiere que exista su clase padre (1 dígito).
   - **Cuenta (4 dígitos):** Requiere que exista su grupo padre (2 dígitos).
   - **Subcuenta (6 dígitos):** Requiere que exista su cuenta padre (4 dígitos).
2. **Naturaleza Contable y Herencia:**
   - Las **clases (1 dígito)** son las únicas que definen su naturaleza (`débito` o `crédito`).
   - Todos los niveles descendientes (grupos, cuentas y subcuentas) **heredan automáticamente** la naturaleza de su clase ancestro.
3. **Unicidad de Código:**
   - No se permite duplicar códigos contables en el catálogo (`409 Conflict`).
4. **Integridad Referencial en Eliminación:**
   - No se puede eliminar una cuenta que contenga cuentas hijas dependientes (`409 Conflict`). Debe eliminarse en orden descendente (de subcuentas hacia clases).
5. **Mapeo de Errores al Input (`field`):**
   - Cuando el servidor rechaza una creación, el backend indica en la respuesta el campo culpable (`field: 'code' | 'nature'`), permitiendo al formulario mostrar el mensaje de error exactamente bajo el input que lo originó.

---

## 🌟 Funcionalidades Adicionales Implementadas (Opcionales P1)

- **Crear cuenta hija desde nodo (`+ Hija`):** Al presionar el botón `+ Hija` en cualquier nodo del árbol, el formulario se precarga automáticamente con el código del padre, calcula la longitud requerida para el hijo y valida que el prefijo coincida.
- **Búsqueda en tiempo real:** Permite filtrar cuentas por código o nombre con resaltado visual (`<mark>`). Si el resultado es un nodo hijo, sus ancestros se auto-expanden para que el resultado sea visible de inmediato.
- **Controles de Árbol:** Botones para **"Expandir todo"** y **"Colapsar todo"** el catálogo.
- **Panel de Estadísticas:** Conteo de cuentas en tiempo real desglosadas por naturaleza (**Débito** vs **Crédito**).
- **Confirmación Modal Accesible:** Diálogo modal para eliminar cuentas con advertencia preventiva si la cuenta tiene hijos y soporte para tecla `Escape` y backdrop blur.

---

## 🤔 Decisiones Técnicas Clave

| Decisión | Justificación |
|----------|---------------|
| **Persistencia en memoria con respaldo JSON (`catalog.json`)** | Garantiza cero fricción para la evaluación (no requiere levantar bases de datos ni Docker), manteniendo lecturas $O(1)$ en memoria y persistiendo los datos ante reinicios del servidor. |
| **Clean Architecture sin decoradores en el dominio** | La entidad `Account` y los 3 casos de uso son TypeScript puro. Son fáciles de testear, no tienen acoplamiento a NestJS ni a Express y son transportables a cualquier otro framework. |
| **Validación por capas (DTO + Dominio)** | Se evita que datos mal formateados lleguen a la capa de aplicación, a la vez que las reglas de negocio complejas quedan centralizadas en un solo lugar. |
| **Sincronización de estado en el árbol mediante Sets** | Permite alternar la visibilidad de cientos de nodos en tiempo constante $O(1)$ sin mutaciones ni renders en cascada innecesarios. |

---

## 🔮 Qué se dejó afuera y qué se haría con más tiempo

1. **Persistencia en Base de Datos Relacional:**
   - Integrar PostgreSQL mediante Prisma o TypeORM con claves foráneas autorreferenciales (`parent_code REFERENCES accounts(code)` con `ON DELETE RESTRICT`) para delegar la integridad referencial al motor de base de datos.
2. **Virtualización de Listas:**
   - Para catálogos empresariales con más de 10,000 cuentas, implementar virtualización en el árbol con `@tanstack/react-virtual` para renderizar únicamente los nodos visibles en el viewport.
3. **Operaciones CRUD adicionales:**
   - Edición de nombres descriptivos (`PUT /accounts/:code`).
4. **Exportación e Importación:**
   - Exportar el catálogo a Excel (XLSX) o PDF con formato contable oficial.
   - Carga masiva de catálogos PUC desde archivos CSV.
5. **Pruebas End-to-End:**
   - Automatización de flujos completos en navegador con Playwright o Cypress.
