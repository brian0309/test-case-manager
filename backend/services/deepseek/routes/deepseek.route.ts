import express from 'express';
import { verifyToken } from '../../../middleware/verifyToken.js';
import {
    generateDeepSeekTestCases,
    generateDeepSeekTestCasesStream,
    getDeepSeekModels,
    getDeepSeekSettings,
    saveDeepSeekSettings,
} from '../controllers/deepseek.controller.js';

const router = express.Router();

router.post('/key', verifyToken, saveDeepSeekSettings);
router.get('/settings', verifyToken, getDeepSeekSettings);
router.get('/models', verifyToken, getDeepSeekModels);
router.post('/generate', verifyToken, generateDeepSeekTestCases);
router.post('/generate-stream', verifyToken, generateDeepSeekTestCasesStream);

export default router;
