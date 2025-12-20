import request from "supertest";
import app from "../../index.js";
import { encryptApiKey, decryptApiKey } from "./gemini.service.js";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

// Mock all models
jest.mock("../../models/user.model.js");

import { User } from "../../models/user.model.js";

const mockUser = User as jest.Mocked<typeof User>;

// Helper function to setup User.findById mock
const setupUserMock = (userId: string, geminiApiKey: string | undefined) => {
  (mockUser.findById as any) = jest.fn().mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(userId),
      email: "test@example.com",
      name: "Test User",
      geminiApiKey,
      save: jest.fn().mockResolvedValue(true),
    }),
  });
};

// Mock the GoogleGenAI class
jest.mock("@google/genai", () => {
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => ({
            models: {
                generateContent: jest.fn().mockResolvedValue({
                    text: JSON.stringify([
                        {
                            title: "Test Case 1",
                            description: "Description 1",
                            preconditions: "Preconditions 1",
                            steps: [{ action: "Action 1", expectedResult: "Result 1" }]
                        }
                    ])
                })
            }
        })),
        Type: {
            ARRAY: "ARRAY",
            OBJECT: "OBJECT",
            STRING: "STRING"
        }
    };
});

const getAuthCookie = (userId: string) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET || "your_jwt_secret_key_here", {
        expiresIn: "7d",
    });
    return `token=${token}`;
};

describe("Gemini Integration", () => {
    let testUserId: string;

    beforeAll(() => {
        // Set a dummy encryption key for testing if not set
        process.env.ENCRYPTION_KEY = "12345678901234567890123456789012";
        process.env.JWT_SECRET = "test_secret";
        testUserId = new Types.ObjectId().toString();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Encryption Service", () => {
        it("should encrypt and decrypt an API key correctly", () => {
            const originalKey = "my-secret-api-key";
            const encrypted = encryptApiKey(originalKey);
            const decrypted = decryptApiKey(encrypted);

            expect(encrypted).not.toBe(originalKey);
            expect(decrypted).toBe(originalKey);
        });
    });

    describe("API Endpoints", () => {
        let cookie: string;
        let userId: string;

        beforeEach(() => {
            userId = new Types.ObjectId().toString();
            cookie = getAuthCookie(userId);
        });

        it("should save the API key encrypted", async () => {
            const apiKey = "test-api-key-123";
            const mockUserDoc = {
                _id: new Types.ObjectId(userId),
                email: "test@example.com",
                geminiApiKey: undefined,
                save: jest.fn().mockResolvedValue(true),
            };

            (mockUser.findById as any) = jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUserDoc),
            });

            const res = await request(app)
                .post("/api/gemini/key")
                .set("Cookie", cookie)
                .send({ apiKey });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockUserDoc.save).toHaveBeenCalled();

            // Verify the API key was set on the user
            expect(mockUserDoc.geminiApiKey).toBeDefined();
            expect(mockUserDoc.geminiApiKey).not.toBe(apiKey);

            // Verify decryption
            const decrypted = decryptApiKey(mockUserDoc.geminiApiKey!);
            expect(decrypted).toBe(apiKey);
        });

        it("should generate test cases using the saved key", async () => {
            const encryptedKey = encryptApiKey("valid-key");
            setupUserMock(userId, encryptedKey);

            const res = await request(app)
                .post("/api/gemini/generate")
                .set("Cookie", cookie)
                .send({
                    context: "Login page",
                    type: "new_case"
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data[0].title).toBe("Test Case 1");
        });

        it("should return 403 if API key is not set", async () => {
            setupUserMock(userId, undefined);

            const res = await request(app)
                .post("/api/gemini/generate")
                .set("Cookie", cookie)
                .send({ context: "test" });

            expect(res.status).toBe(403);
        });
    });
});
