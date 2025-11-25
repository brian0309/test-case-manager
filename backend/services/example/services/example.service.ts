import { ExampleResponse } from "../types/example.types.js";

/**
 * Get hello world message
 * @param userId - Optional user ID to personalize the message
 * @param userEmail - Optional user email to personalize the message
 * @returns ExampleResponse with hello world message
 */
export const getHelloWorld = (userId?: string, userEmail?: string): ExampleResponse => {
  const response: ExampleResponse = {
    success: true,
    message: "Hello World",
    timestamp: new Date().toISOString(),
  };

  if (userId && userEmail) {
    response.user = {
      id: userId,
      email: userEmail,
    };
  }

  return response;
};
