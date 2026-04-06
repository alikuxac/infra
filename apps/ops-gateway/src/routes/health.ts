import { Hono } from 'hono';

const health = new Hono<{ Bindings: Env }>();

health.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.0.1',
  });
});

export default health;
