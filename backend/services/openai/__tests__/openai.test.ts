// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

jest.mock('../../../models/user.model.js');

import openaiRoutes from '../routes/openai.route.js';
import { User } from '../../../models/user.model.js';
import { encryptApiKey, decryptApiKey } from '../../ai-shared/index.js';

const mockUser = User as jest.Mocked<typeof User>;

const getAuthCookie = (userId: string): string => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '7d' });
    return `token=${token}`;
};

const setupUserMock = (userId: string, openaiApiKey: string | undefined, extra: Record<string, unknown> = {}) => {
    const userDoc: any = {
        _id: new Types.ObjectId(userId),
        email: 'test@example.com',
        name: 'Test User',
        openaiApiKey,
        openaiModel: 'gpt-5',
        openaiVisibleModels: [],
        openaiCustomModels: [],
        preferredAiProvider: 'gemini',
        ...extra,
    };

    (mockUser.findById as any) = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(userDoc),
    });
};

describe('OpenAI Integration', () => {
    let app: Express;
    let fetchSpy: any;

    beforeAll(() => {
        process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
        process.env.JWT_SECRET = 'test_secret';

        app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use('/api/openai', openaiRoutes);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        fetchSpy = jest.spyOn(globalThis, 'fetch');
    });

    describe('Encryption Service', () => {
        it('should encrypt and decrypt an API key correctly', () => {
            const originalKey = 'sk-test-openai-123';
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
            const apiKey = 'sk-test-openai-456';

            (mockUser.findByIdAndUpdate as any) = jest.fn().mockResolvedValue(true as any);

            const res = await request(app)
                .post('/api/openai/key')
                .set('Cookie', cookie)
                .send({ apiKey });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const updateArg = (mockUser.findByIdAndUpdate as jest.Mock).mock.calls[0][1] as any;
            expect(updateArg.openaiApiKey).toBeDefined();
            expect(updateArg.openaiApiKey).not.toBe(apiKey);
            expect(decryptApiKey(updateArg.openaiApiKey)).toBe(apiKey);
        });

        it('should return settings without leaking the API key', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);

            setupUserMock(userId, encryptApiKey('valid-key'));

            fetchSpy.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ data: [{ id: 'gpt-5', object: 'model' }] }),
            } as any);

            const res = await request(app)
                .get('/api/openai/settings?refresh=1')
                .set('Cookie', cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.hasApiKey).toBe(true);
            expect(res.body.data.model).toBe('gpt-5');
            expect(res.body.data.availableModels.length).toBeGreaterThan(0);
            expect(res.body.data.openaiApiKey).toBeUndefined();
        });

        it('should generate test cases using the saved key', async () => {
            const userId = new Types.ObjectId().toString();
            const cookie = getAuthCookie(userId);

            setupUserMock(userId, encryptApiKey('valid-key'));

            fetchSpy.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    id: 'resp_1',
                    object: 'response',
                    model: 'gpt-5',
                    output: [
                        {
                            type: 'message',
                            role: 'assistant',
                            content: [
                                {
                                    type: 'output_text',
                                    text: JSON.stringify([
                                        {
                                            title: 'Test Case 1',
                                            description: 'Description 1',
                                            preconditions: 'Preconditions 1',
                                        },
                                    ]),
                                },
                            ],
                        },
                    ],
                }),
            } as any);

            const res = await request(app)
                .post('/api/openai/generate')
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
                .post('/api/openai/generate')
                .set('Cookie', cookie)
                .send({ context: 'test' });

            expect(res.status).toBe(403);
        });
    });
});
