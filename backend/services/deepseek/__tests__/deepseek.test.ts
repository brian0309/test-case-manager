// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

jest.mock('../../../models/user.model.js');

import deepseekRoutes from '../routes/deepseek.route.js';
import { User } from '../../../models/user.model.js';
import { encryptApiKey, decryptApiKey } from '../../ai-shared/index.js';

const mockUser = User as jest.Mocked<typeof User>;

const getAuthCookie = (userId: string): string => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '7d' });
    return `token=${token}`;
};

const setupUserMock = (userId: string, deepseekApiKey: string | undefined, extra: Record<string, unknown> = {}) => {
    const userDoc: any = {
        _id: new Types.ObjectId(userId),
        email: 'test@example.com',
        name: 'Test User',
        deepseekApiKey,
        deepseekModel: 'deepseek-v4-flash',
        deepseekVisibleModels: [],
        deepseekCustomModels: [],
        preferredAiProvider: 'gemini',
        ...extra,
    };

    (mockUser.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(userDoc),
    });
};

describe('DeepSeek Integration', () => {
    let app: Express;
    let fetchSpy: any;

    beforeAll(() => {
        process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
        process.env.JWT_SECRET = 'test_secret';

        app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use('/api/deepseek', deepseekRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        fetchSpy = jest.spyOn(globalThis, 'fetch');
    });

    describe('Encryption Service', () => {
        it('should encrypt and decrypt an API key correctly', () => {
            const originalKey = 'sk-deepseek-test-123';
            const encrypted = encryptApiKey(originalKey);
            const decrypted = decryptApiKey(encrypted);

            expect(encrypted).not.toBe(originalKey);
            expect(decrypted).toBe(originalKey);
        });
    });

    describe('API Endpoints', () => {
        it('should save the API key encrypted', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);
            const apiKey = 'sk-deepseek-test-456';

            (mockUser.findByIdAndUpdate as any) = jest.fn().mockResolvedValue(true as any);

            const res = await request(app)
                .post('/api/deepseek/key')
                .set('Cookie', cookie)
                .send({ apiKey });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const updateArg = (mockUser.findByIdAndUpdate as jest.Mock).mock.calls[0][1] as any;
            expect(updateArg.deepseekApiKey).toBeDefined();
            expect(updateArg.deepseekApiKey).not.toBe(apiKey);
            expect(decryptApiKey(updateArg.deepseekApiKey)).toBe(apiKey);
        });

        it('should return settings without leaking the API key', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);

            setupUserMock(userId, encryptApiKey('valid-key'));

            fetchSpy.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    object: 'list',
                    data: [
                        { id: 'deepseek-v4-flash', object: 'model', owned_by: 'deepseek' },
                        { id: 'deepseek-v4-pro', object: 'model', owned_by: 'deepseek' },
                    ],
                }),
            } as any);

            const res = await request(app)
                .get('/api/deepseek/settings?refresh=1')
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.hasApiKey).toBe(true);
            expect(res.body.data.model).toBe('deepseek-v4-flash');
            expect(res.body.data.availableModels.some((m: { value: string }) => m.value === 'deepseek-v4-pro')).toBe(true);
            expect(res.body.data.deepseekApiKey).toBeUndefined();
        });

        it('should fall back to the static model list when the models request fails', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);

            setupUserMock(userId, encryptApiKey('valid-key'));

            fetchSpy.mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({}),
            } as any);

            const res = await request(app)
                .get('/api/deepseek/models?refresh=1')
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.availableModels.some((m: { value: string }) => m.value === 'deepseek-v4-flash')).toBe(true);
        });

        it('should generate test cases using the saved key', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);

            setupUserMock(userId, encryptApiKey('valid-key'));

            fetchSpy.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    id: 'chatcmpl_1',
                    object: 'chat.completion',
                    model: 'deepseek-chat',
                    choices: [
                        {
                            index: 0,
                            finish_reason: 'stop',
                            message: {
                                role: 'assistant',
                                content: JSON.stringify([
                                    {
                                        title: 'Test Case 1',
                                        description: 'Description 1',
                                        preconditions: 'Preconditions 1',
                                    },
                                ]),
                            },
                        },
                    ],
                }),
            } as any);

            const res = await request(app)
                .post('/api/deepseek/generate')
                .set('Cookie', cookie)
                .send({ context: 'Login page' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data[0].title).toBe('Test Case 1');
        });

        it('should return 403 if API key is not set', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);

            setupUserMock(userId, undefined);

            const res = await request(app)
                .post('/api/deepseek/generate')
                .set('Cookie', cookie)
                .send({ context: 'test' });

            expect(res.status).toBe(403);
        });
    });
});
