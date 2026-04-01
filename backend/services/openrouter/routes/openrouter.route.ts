import express from 'express';
import { verifyToken } from '../../../middleware/verifyToken.js';
import {
    generateOpenRouterTestCases,
    generateOpenRouterTestCasesStream,
    getOpenRouterModels,
    getOpenRouterSettings,
    saveOpenRouterSettings,
} from '../controllers/openrouter.controller.js';

const router = express.Router();

router.post('/key', verifyToken, saveOpenRouterSettings);
router.get('/settings', verifyToken, getOpenRouterSettings);
router.get('/models', verifyToken, getOpenRouterModels);
router.post('/generate', verifyToken, generateOpenRouterTestCases);
router.post('/generate-stream', verifyToken, generateOpenRouterTestCasesStream);

export default router;
