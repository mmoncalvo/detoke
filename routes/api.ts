import express from 'express';
const router = express.Router();

router.use('/auth', (await import('./auth.js')).default);
router.use('/users', (await import('./users.js')).default);
router.use('/products', (await import('./products.js')).default);

export default router;
