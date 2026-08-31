import request from 'supertest';
import app from '../app';

describe('Health Check API', () => {
  it('should return UP on GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return READY on GET /api/health/ready', async () => {
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('READY');
  });
});
