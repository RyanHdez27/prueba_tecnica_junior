/**
 * InMemoryAccountRepository — Repositorio en memoria con respaldo en archivo JSON.
 *
 * Almacena las cuentas en un Map<código, Account> para lecturas O(1)
 * y sincroniza automáticamente con un archivo JSON en disco para
 * que los datos sobrevivan reinicios del servidor.
 *
 * Flujo:
 *   1. Al instanciarse, lee data/catalog.json (si existe) y carga el Map.
 *   2. En cada mutación (save/delete), reescribe el archivo completo.
 *
 * Se eligió esta estrategia porque:
 *   - Cero dependencias externas (solo fs y path de Node.js).
 *   - Rendimiento idéntico al Map puro para lectura.
 *   - Persistencia real sin configurar base de datos.
 *   - El enunciado permite persistencia libre.
 *   - La arquitectura permite reemplazar esta clase por una con SQL
 *     sin tocar dominio ni casos de uso.
 *
 * Limitación aceptable: la escritura es síncrona y reescribe todo el archivo.
 * Para un catálogo contable típico (cientos de cuentas) es despreciable.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Account } from '../../domain/entities/account.entity.js';
import type { AccountNature } from '../../domain/entities/account.entity.js';
import type { AccountRepository } from '../../domain/repositories/account.repository.js';

/**
 * Ruta del directorio y archivo de datos.
 * Se usa process.cwd() porque apunta siempre a la carpeta api/,
 * independientemente de si el código corre desde src/ o dist/.
 */
const DATA_DIR = resolve(process.cwd(), 'data');
const DATA_FILE = resolve(DATA_DIR, 'catalog.json');

/** Estructura del JSON almacenado en disco (una cuenta serializada) */
interface AccountRecord {
  code: string;
  name: string;
  nature: AccountNature;
}

export class InMemoryAccountRepository implements AccountRepository {
  /**
   * Almacén principal: Map donde la clave es el código de la cuenta.
   * Se usa Map en lugar de un objeto plano por mejor rendimiento
   * en inserciones y búsquedas frecuentes.
   */
  private readonly accounts = new Map<string, Account>();

  /**
   * Constructor: intenta cargar las cuentas desde el archivo JSON.
   * Si el archivo no existe o está vacío, arranca con el Map vacío.
   */
  constructor() {
    this.loadFromDisk();
  }

  /**
   * Busca una cuenta por código exacto.
   * Complejidad: O(1) gracias al Map.
   */
  findByCode(code: string): Account | null {
    return this.accounts.get(code) ?? null;
  }

  /**
   * Retorna todas las cuentas como lista plana (sin orden particular).
   * El caso de uso se encarga de armar el árbol jerárquico.
   */
  findAll(): Account[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Guarda una nueva cuenta en el almacén y sincroniza con disco.
   * No valida reglas de negocio — eso es responsabilidad del caso de uso.
   */
  save(account: Account): void {
    this.accounts.set(account.code, account);
    this.saveToDisk();
  }

  /**
   * Elimina una cuenta por código y sincroniza con disco.
   * No lanza error si el código no existe (operación idempotente).
   * La validación de existencia la hace el caso de uso.
   */
  delete(code: string): void {
    this.accounts.delete(code);
    this.saveToDisk();
  }

  /**
   * Verifica si alguna cuenta tiene como padre directo al código dado.
   * Recorre todas las cuentas y compara el getParentCode() de cada una.
   *
   * Ejemplo: hasChildren("11") → true si existe "1105" (cuyo padre es "11").
   *
   * Complejidad: O(n) donde n es el total de cuentas.
   * Aceptable para un catálogo contable típico (cientos de cuentas).
   */
  hasChildren(code: string): boolean {
    for (const account of this.accounts.values()) {
      if (account.getParentCode() === code) {
        return true;
      }
    }
    return false;
  }

  /**
   * Lee el archivo catalog.json y puebla el Map.
   * Si el archivo no existe o tiene contenido inválido, simplemente
   * arranca con el Map vacío (sin lanzar error).
   */
  private loadFromDisk(): void {
    try {
      if (!existsSync(DATA_FILE)) return;

      const raw = readFileSync(DATA_FILE, 'utf-8');
      const records: AccountRecord[] = JSON.parse(raw);

      for (const record of records) {
        const account = new Account(record.code, record.name, record.nature);
        this.accounts.set(account.code, account);
      }
    } catch {
      // Si el archivo está corrupto o vacío, arrancamos limpio.
      // No lanzamos error para no bloquear el inicio del servidor.
    }
  }

  /**
   * Serializa todo el Map a JSON y lo escribe en disco.
   * Crea el directorio data/ si no existe.
   *
   * Se usa writeFileSync porque la escritura es atómica respecto al
   * estado del Map y para un catálogo pequeño es instantánea (~1ms).
   */
  private saveToDisk(): void {
    // Crear directorio data/ si no existe
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    // Convertir el Map a un array de objetos planos
    const records: AccountRecord[] = Array.from(this.accounts.values()).map(
      (account) => ({
        code: account.code,
        name: account.name,
        nature: account.nature,
      }),
    );

    // Escribir con indentación para que sea legible si se inspecciona
    writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  }
}
