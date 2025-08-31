import express from 'express';
import { markPaid, getPaymentsForSession, getPaymentSchedule, setPaymentStatus } from '../Controller/paymentController.js';

const router = express.Router();

router.post('/:sessionId/mark-paid', markPaid);
router.get('/:sessionId', getPaymentsForSession);
router.get('/:sessionId/schedule', getPaymentSchedule);
router.post('/:sessionId/status', setPaymentStatus);

export default router;


