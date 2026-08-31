import { Router } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);

// Example protected route for testing
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
