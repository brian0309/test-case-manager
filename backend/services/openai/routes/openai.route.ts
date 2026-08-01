import express from 'express';
import { verifyToken } from '../../../middleware/verifyToken.js';
import {
    generateOpenAITestCases,
    generateOpenAITestCasesStream,
    getOpenAIModels,
    getOpenAISettings,
    saveOpenAISettings,
} from '../controllers/openai.controller.js';

const router = express.Router();

router.post('/key', verifyToken, saveOpenAISettings);
router.get('/settings', verifyToken, getOpenAISettings);
router.get('/models', verifyToken, getOpenAIModels);
router.post('/generate', verifyToken, generateOpenAITestCases);
router.post('/generate-stream', verifyToken, generateOpenAITestCasesStream);

export default router;
