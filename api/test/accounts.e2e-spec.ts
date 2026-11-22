import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Accounts API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /accounts/tree', () => {
    it('debe retornar el árbol jerárquico contable con status 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/accounts/tree')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verificar estructura de una clase raíz
      const firstClass = response.body[0];
      expect(firstClass).toHaveProperty('code');
      expect(firstClass).toHaveProperty('name');
      expect(firstClass).toHaveProperty('nature');
      expect(firstClass).toHaveProperty('level', 'clase');
      expect(Array.isArray(firstClass.children)).toBe(true);
    });
  });

  describe('POST /accounts', () => {
    it('debe crear exitosamente una cuenta hija cuando el padre existe (201 Created)', async () => {
      // Crear una subcuenta de prueba bajo "1105" (Caja)
      const testCode = '110599';
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: testCode,
          name: 'Caja Test E2E',
        })
        .expect(201);

      expect(response.body).toEqual({
        code: testCode,
        name: 'Caja Test E2E',
        nature: 'debito', // Heredada de la clase 1 (Activo)
        level: 'subcuenta',
      });

      // Limpiar eliminando la cuenta creada
      await request(app.getHttpServer())
        .delete(`/accounts/${testCode}`)
        .expect(204);
    });

    it('debe rechazar la creación si el código tiene una longitud no permitida (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '123', // 3 dígitos no es válido
          name: 'Cuenta Inválida',
        })
        .expect(400);

      expect(response.body.message).toContain('no es válido');
      expect(response.body.field).toBe('code');
    });

    it('debe rechazar la creación si el código no es numérico (400 Bad Request por class-validator)', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '11AB',
          name: 'Código alfanumérico',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('debe rechazar la creación si el padre no existe en el catálogo (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '9901', // Padre "99" no existe
          name: 'Huérfana',
        })
        .expect(400);

      expect(response.body.message).toContain('padre "99" no existe');
      expect(response.body.field).toBe('code');
    });

    it('debe rechazar la creación si el código ya existe en el catálogo (409 Conflict)', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '1', // Activo ya existe
          name: 'Activo Duplicado',
          nature: 'debito',
        })
        .expect(409);

      expect(response.body.message).toContain('Ya existe una cuenta');
      expect(response.body.field).toBe('code');
    });

    it('debe exigir naturaleza si se crea una cuenta de nivel clase (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: '8', // Nueva clase sin naturaleza
          name: 'Cuentas de Orden Deudoras',
        })
        .expect(400);

      expect(response.body.message).toContain('requiere naturaleza');
      expect(response.body.field).toBe('nature');
    });
  });

  describe('DELETE /accounts/:code', () => {
    it('debe rechazar la eliminación si la cuenta tiene cuentas hijas dependientes (409 Conflict)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/accounts/1') // Activo tiene hijas (11, 13, etc.)
        .expect(409);

      expect(response.body.message).toContain('porque tiene cuentas hijas');
    });

    it('debe retornar 404 Not Found si se intenta eliminar una cuenta inexistente', async () => {
      const response = await request(app.getHttpServer())
        .delete('/accounts/999999')
        .expect(404);

      expect(response.body.message).toContain('No se encontró la cuenta');
    });

    it('debe eliminar exitosamente una cuenta hoja (204 No Content)', async () => {
      // 1. Crear una subcuenta hoja temporal
      const testLeaf = '110598';
      await request(app.getHttpServer())
        .post('/accounts')
        .send({
          code: testLeaf,
          name: 'Hoja para Eliminar',
        })
        .expect(201);

      // 2. Eliminarla exitosamente
      await request(app.getHttpServer())
        .delete(`/accounts/${testLeaf}`)
        .expect(204);

      // 3. Confirmar que ya no existe (404 al intentar re-eliminarla)
      await request(app.getHttpServer())
        .delete(`/accounts/${testLeaf}`)
        .expect(404);
    });
  });
});
