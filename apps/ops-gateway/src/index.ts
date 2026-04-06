import { Hono } from 'hono';
import { verifyGatewaySecret } from './middleware/security';
import health from './routes/health';
import compassEvent from './routes/compass-event';
import compassCustom from './routes/compass-custom';
import admin from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// Health check (public, no auth required)
app.route('/health', health);

// Apply gateway secret verification to all other routes
app.use('*', verifyGatewaySecret);

// Compass event routes
app.route('/compass/event', compassEvent);
app.route('/compass/custom', compassCustom);

// Admin routes (has its own verifyAdmin middleware)
app.route('/admin', admin);

// Global error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
