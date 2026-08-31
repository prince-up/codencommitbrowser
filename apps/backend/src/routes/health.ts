import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({ status: 'READY' });
});

export default router;
