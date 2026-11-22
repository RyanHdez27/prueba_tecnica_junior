import { describe, it, expect, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Account } from '../domain/entities/account.entity.js';
import type { AccountRepository } from '../domain/repositories/account.repository.js';
import { CreateAccountUseCase } from '../application/use-cases/create-account.use-case.js';
import { GetCatalogTreeUseCase } from '../application/use-cases/get-catalog-tree.use-case.js';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account.use-case.js';
import { AccountsController } from './accounts.controller.js';
import {
  InvalidAccountCodeError,
  AccountAlreadyExistsError,
  ParentNotFoundError,
  NatureRequiredError,
  AccountNotFoundError,
  AccountHasChildrenError,
} from '../domain/errors/domain-errors.js';

class MockAccountRepository implements AccountRepository {
  private accounts = new Map<string, Account>();

  findByCode(code: string): Account | null {
    return this.accounts.get(code) ?? null;
  }

  findAll(): Account[] {
    return Array.from(this.accounts.values());
  }

  save(account: Account): void {
    this.accounts.set(account.code, account);
  }

  delete(code: string): void {
    this.accounts.delete(code);
  }

  hasChildren(code: string): boolean {
    for (const acc of this.accounts.values()) {
      if (acc.getParentCode() === code) {
        return true;
      }
    }
    return false;
  }
}

describe('Entidad de Dominio Account', () => {
  it('debe validar códigos permitidos de 1, 2, 4 y 6 dígitos', () => {
    expect(Account.isValidCode('1')).toBe(true);
    expect(Account.isValidCode('11')).toBe(true);
    expect(Account.isValidCode('1105')).toBe(true);
    expect(Account.isValidCode('110505')).toBe(true);

    expect(Account.isValidCode('')).toBe(false);
    expect(Account.isValidCode('123')).toBe(false);
    expect(Account.isValidCode('12345')).toBe(false);
    expect(Account.isValidCode('11050501')).toBe(false);
    expect(Account.isValidCode('11A5')).toBe(false);
  });

  it('debe calcular correctamente el nivel jerárquico según la longitud', () => {
    const clase = new Account('1', 'Activo', 'debito');
    const grupo = new Account('11', 'Disponible', 'debito');
    const cuenta = new Account('1105', 'Caja', 'debito');
    const subcuenta = new Account('110505', 'Caja General', 'debito');

    expect(clase.level).toBe('clase');
    expect(grupo.level).toBe('grupo');
    expect(cuenta.level).toBe('cuenta');
    expect(subcuenta.level).toBe('subcuenta');
    expect(clase.isClass).toBe(true);
    expect(grupo.isClass).toBe(false);
  });

  it('debe calcular el código del padre exacto', () => {
    const subcuenta = new Account('110505', 'Caja General', 'debito');
    const cuenta = new Account('1105', 'Caja', 'debito');
    const grupo = new Account('11', 'Disponible', 'debito');
    const clase = new Account('1', 'Activo', 'debito');

    expect(subcuenta.getParentCode()).toBe('1105');
    expect(cuenta.getParentCode()).toBe('11');
    expect(grupo.getParentCode()).toBe('1');
    expect(clase.getParentCode()).toBeNull();
  });
});

describe('Casos de uso de Cuentas Contables', () => {
  let repo: MockAccountRepository;
  let createUseCase: CreateAccountUseCase;
  let treeUseCase: GetCatalogTreeUseCase;
  let deleteUseCase: DeleteAccountUseCase;

  beforeEach(() => {
    repo = new MockAccountRepository();
    createUseCase = new CreateAccountUseCase(repo);
    treeUseCase = new GetCatalogTreeUseCase(repo);
    deleteUseCase = new DeleteAccountUseCase(repo);
  });

  describe('CreateAccountUseCase', () => {
    it('debe crear una clase raíz con naturaleza obligatoria', () => {
      const account = createUseCase.execute({
        code: '1',
        name: 'Activo',
        nature: 'debito',
      });

      expect(account.code).toBe('1');
      expect(account.name).toBe('Activo');
      expect(account.nature).toBe('debito');
      expect(account.level).toBe('clase');
    });

    it('debe lanzar NatureRequiredError si se intenta crear una clase sin naturaleza', () => {
      expect(() =>
        createUseCase.execute({ code: '1', name: 'Activo' }),
      ).toThrow(NatureRequiredError);
    });

    it('debe lanzar InvalidAccountCodeError si el código tiene una longitud no permitida', () => {
      expect(() =>
        createUseCase.execute({ code: '123', name: 'Invalido' }),
      ).toThrow(InvalidAccountCodeError);
    });

    it('debe heredar la naturaleza del ancestro clase al crear un grupo hijo', () => {
      createUseCase.execute({ code: '1', name: 'Activo', nature: 'debito' });
      const group = createUseCase.execute({ code: '11', name: 'Disponible' });

      expect(group.code).toBe('11');
      expect(group.nature).toBe('debito');
      expect(group.level).toBe('grupo');
    });

    it('debe lanzar ParentNotFoundError si el padre no existe', () => {
      expect(() =>
        createUseCase.execute({ code: '1105', name: 'Caja' }),
      ).toThrow(ParentNotFoundError);
    });

    it('debe lanzar AccountAlreadyExistsError si el código ya existe', () => {
      createUseCase.execute({ code: '1', name: 'Activo', nature: 'debito' });
      expect(() =>
        createUseCase.execute({ code: '1', name: 'Activo Duplicado', nature: 'debito' }),
      ).toThrow(AccountAlreadyExistsError);
    });
  });

  describe('GetCatalogTreeUseCase', () => {
    it('debe retornar el árbol jerárquico anidado', () => {
      createUseCase.execute({ code: '1', name: 'Activo', nature: 'debito' });
      createUseCase.execute({ code: '11', name: 'Disponible' });
      createUseCase.execute({ code: '1105', name: 'Caja' });
      createUseCase.execute({ code: '110505', name: 'Caja General' });

      const tree = treeUseCase.execute();

      expect(tree).toHaveLength(1);
      expect(tree[0].code).toBe('1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].code).toBe('11');
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].code).toBe('1105');
      expect(tree[0].children[0].children[0].children[0].code).toBe('110505');
    });

    it('debe retornar un array vacío si no hay cuentas', () => {
      const tree = treeUseCase.execute();
      expect(tree).toEqual([]);
    });
  });

  describe('DeleteAccountUseCase', () => {
    it('debe lanzar AccountNotFoundError si la cuenta no existe', () => {
      expect(() => deleteUseCase.execute('99')).toThrow(AccountNotFoundError);
    });

    it('debe lanzar AccountHasChildrenError si la cuenta tiene hijas', () => {
      createUseCase.execute({ code: '1', name: 'Activo', nature: 'debito' });
      createUseCase.execute({ code: '11', name: 'Disponible' });

      expect(() => deleteUseCase.execute('1')).toThrow(AccountHasChildrenError);
    });

    it('debe eliminar la cuenta si es hoja (sin hijas)', () => {
      createUseCase.execute({ code: '1', name: 'Activo', nature: 'debito' });
      createUseCase.execute({ code: '11', name: 'Disponible' });

      deleteUseCase.execute('11');
      expect(repo.findByCode('11')).toBeNull();

      deleteUseCase.execute('1');
      expect(repo.findByCode('1')).toBeNull();
    });
  });
});

describe('AccountsController (Unit)', () => {
  let controller: AccountsController;
  let repo: MockAccountRepository;

  beforeEach(() => {
    repo = new MockAccountRepository();
    const createUseCase = new CreateAccountUseCase(repo);
    const treeUseCase = new GetCatalogTreeUseCase(repo);
    const deleteUseCase = new DeleteAccountUseCase(repo);
    controller = new AccountsController(createUseCase, treeUseCase, deleteUseCase);
  });

  it('debe retornar 201 y la cuenta formateada al crear exitosamente', () => {
    const result = controller.create({
      code: '1',
      name: 'Activo',
      nature: 'debito',
    });

    expect(result).toEqual({
      code: '1',
      name: 'Activo',
      nature: 'debito',
      level: 'clase',
    });
  });

  it('debe mapear ParentNotFoundError a HttpException con status 400 y field "code"', () => {
    try {
      controller.create({ code: '11', name: 'Disponible' });
      expect.fail('Debió lanzar error');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      const response = httpErr.getResponse() as Record<string, unknown>;
      expect(response.field).toBe('code');
    }
  });

  it('debe mapear AccountHasChildrenError a HttpException con status 409', () => {
    controller.create({ code: '1', name: 'Activo', nature: 'debito' });
    controller.create({ code: '11', name: 'Disponible' });

    try {
      controller.remove('1');
      expect.fail('Debió lanzar error');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.CONFLICT);
    }
  });
});
