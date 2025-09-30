import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/modules/app.module';

describe('Metrics endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns occupancy data', async () => {
    const res = await request(app.getHttpServer()).get('/metrics/occupancy').query({ propertyId: 'prop-1' });
    expect(res.status).toBe(200);
    expect(res.body.current).toBeDefined();
  });

  it('returns tiles array', async () => {
    const res = await request(app.getHttpServer()).get('/metrics/tiles').query({ propertyId: 'prop-1' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
