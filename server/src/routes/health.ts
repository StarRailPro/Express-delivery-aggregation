import { Router, Request, Response } from 'express';
import { successResponse } from '../utils/responseHandler';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  successResponse(res, { status: 'ok', timestamp: new Date().toISOString() }, '服务运行正常');
});

export default router;
