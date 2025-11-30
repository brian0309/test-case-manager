import request from "supertest";
import app from "../../index.js";
import { User } from "../../models/user.model.js";
import { connectTestDb, disconnectTestDb } from "../../__tests__/setup/testDb.js";
import { createTestUser } from "../../__tests__/helpers/testHelpers.js";
import { encryptApiKey, decryptApiKey } from "./gemini.service.js";
import jwt from "jsonwebtoken";

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
    beforeAll(async () => {
        await connectTestDb();
        // Set a dummy encryption key for testing if not set
        process.env.ENCRYPTION_KEY = "12345678901234567890123456789012";
        process.env.JWT_SECRET = "test_secret";
    });

    afterAll(async () => {
        await disconnectTestDb();
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

        beforeEach(async () => {
            const user = await createTestUser({
                email: "test@example.com",
                password: "password123",
                name: "Test User"
            });
            userId = user._id.toString();
            cookie = getAuthCookie(userId);
        });

        it("should save the API key encrypted", async () => {
            const apiKey = "test-api-key-123";

            const res = await request(app)
                .post("/api/gemini/key")
                .set("Cookie", cookie)
                .send({ apiKey });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify in DB
            const updatedUser = await User.findById(userId).select('+geminiApiKey');
            expect(updatedUser?.geminiApiKey).toBeDefined();
            expect(updatedUser?.geminiApiKey).not.toBe(apiKey);

            // Verify decryption
            const decrypted = decryptApiKey(updatedUser!.geminiApiKey!);
            expect(decrypted).toBe(apiKey);
        });

        it("should generate test cases using the saved key", async () => {
            // First save the key
            await request(app)
                .post("/api/gemini/key")
                .set("Cookie", cookie)
                .send({ apiKey: "valid-key" });

            // Then generate
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
            // Create a new user without key
            const newUser = await createTestUser({
                email: "nokey@example.com",
                password: "password123",
                name: "No Key User"
            });
            const newCookie = getAuthCookie(newUser._id.toString());

            const res = await request(app)
                .post("/api/gemini/generate")
                .set("Cookie", newCookie)
                .send({ context: "test" });

            expect(res.status).toBe(403);
        });
    });
});
