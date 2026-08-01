import express from 'express';
import { verifyToken } from '../../../middleware/verifyToken.js';
import {
    generateAnthropicTestCases,
    generateAnthropicTestCasesStream,
    getAnthropicModels,
    getAnthropicSettings,
    saveAnthropicSettings,
} from '../controllers/anthropic.controller.js';

const router = express.Router();

router.post('/key', verifyToken, saveAnthropicSettings);
router.get('/settings', verifyToken, getAnthropicSettings);
router.get('/models', verifyToken, getAnthropicModels);
router.post('/generate', verifyToken, generateAnthropicTestCases);
router.post('/generate-stream', verifyToken, generateAnthropicTestCasesStream);

export default router;
