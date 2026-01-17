// Mock the mailtrap config before importing the module
jest.mock("../mailtrap.config.js", () => ({
  mailtrapClient: {
    send: jest.fn(),
  },
  sender: {
    email: "test@test.com",
    name: "Test Sender",
  },
}));

jest.mock("../emailTemplates.js", () => ({
  VERIFICATION_EMAIL_TEMPLATE: "Verify your email with code: {verificationCode}",
  WELCOME_TEMPLATE: "Welcome {name} to {company_info_name}!",
  PASSWORD_RESET_REQUEST_TEMPLATE: "Reset your password: {resetURL}",
  PASSWORD_RESET_SUCCESS_TEMPLATE: "Your password has been reset successfully.",
}));

import { mailtrapClient } from "../mailtrap.config.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} from "../emails.js";

const mockMailtrapClient = mailtrapClient as any;

describe("Email Service", () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("sendVerificationEmail", () => {
    it("should send verification email with correct parameters", async () => {
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendVerificationEmail("user@test.com", "123456");

      expect(mockMailtrapClient.send).toHaveBeenCalledWith({
        from: { email: "test@test.com", name: "Test Sender" },
        to: [{ email: "user@test.com" }],
        subject: "Verify your email",
        html: "Verify your email with code: 123456",
        category: "Email Verification",
      });
    });

    it("should log success message", async () => {
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendVerificationEmail("user@test.com", "123456");

      expect(consoleLogSpy).toHaveBeenCalledWith("Email sent successfully", { success: true });
    });

    it("should throw error when send fails", async () => {
      (mockMailtrapClient.send as jest.Mock).mockRejectedValue(new Error("Send failed"));

      await expect(sendVerificationEmail("user@test.com", "123456")).rejects.toThrow(
        "Error sending verification email: Error: Send failed"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error sending verification", expect.any(Error));
    });
  });

  describe("sendWelcomeEmail", () => {
    it("should send welcome email with HTML fallback when no template UUID", async () => {
      delete process.env.MAILTRAP_WELCOME_TEMPLATE_UUID;
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendWelcomeEmail("user@test.com", "John");

      expect(mockMailtrapClient.send).toHaveBeenCalledWith({
        from: { email: "test@test.com", name: "Test Sender" },
        to: [{ email: "user@test.com" }],
        subject: "Welcome to Auth Company",
        html: "Welcome John to Auth Company!",
        category: "Welcome",
      });
    });

    it("should use template UUID when configured", async () => {
      process.env.MAILTRAP_WELCOME_TEMPLATE_UUID = "test-template-uuid";
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendWelcomeEmail("user@test.com", "John");

      expect(mockMailtrapClient.send).toHaveBeenCalledWith({
        from: { email: "test@test.com", name: "Test Sender" },
        to: [{ email: "user@test.com" }],
        template_uuid: "test-template-uuid",
        template_variables: {
          company_info_name: "Auth Company",
          name: "John",
        },
      });

      delete process.env.MAILTRAP_WELCOME_TEMPLATE_UUID;
    });

    it("should fallback to HTML when template send fails", async () => {
      process.env.MAILTRAP_WELCOME_TEMPLATE_UUID = "test-template-uuid";
      
      // First call (template) fails, second call (HTML fallback) succeeds
      (mockMailtrapClient.send as jest.Mock)
        .mockRejectedValueOnce(new Error("Template not found"))
        .mockResolvedValueOnce({ success: true });

      await sendWelcomeEmail("user@test.com", "John");

      expect(mockMailtrapClient.send).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Mailtrap template send failed, falling back to HTML. Error:",
        expect.any(Error)
      );

      delete process.env.MAILTRAP_WELCOME_TEMPLATE_UUID;
    });

    it("should throw error when both template and HTML send fail", async () => {
      process.env.MAILTRAP_WELCOME_TEMPLATE_UUID = "test-template-uuid";
      
      (mockMailtrapClient.send as jest.Mock)
        .mockRejectedValueOnce(new Error("Template not found"))
        .mockRejectedValueOnce(new Error("HTML send failed"));

      await expect(sendWelcomeEmail("user@test.com", "John")).rejects.toThrow(
        "Error sending welcome email: Error: HTML send failed"
      );

      delete process.env.MAILTRAP_WELCOME_TEMPLATE_UUID;
    });
  });

  describe("sendPasswordResetEmail", () => {
    it("should send password reset email with correct parameters", async () => {
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendPasswordResetEmail("user@test.com", "https://example.com/reset?token=abc");

      expect(mockMailtrapClient.send).toHaveBeenCalledWith({
        from: { email: "test@test.com", name: "Test Sender" },
        to: [{ email: "user@test.com" }],
        subject: "Reset your password",
        html: "Reset your password: https://example.com/reset?token=abc",
        category: "Password Reset",
      });
    });

    it("should throw error when send fails", async () => {
      (mockMailtrapClient.send as jest.Mock).mockRejectedValue(new Error("Send failed"));

      await expect(
        sendPasswordResetEmail("user@test.com", "https://example.com/reset")
      ).rejects.toThrow("Error sending password reset email: Error: Send failed");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error sending password reset email",
        expect.any(Error)
      );
    });
  });

  describe("sendResetSuccessEmail", () => {
    it("should send reset success email with correct parameters", async () => {
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendResetSuccessEmail("user@test.com");

      expect(mockMailtrapClient.send).toHaveBeenCalledWith({
        from: { email: "test@test.com", name: "Test Sender" },
        to: [{ email: "user@test.com" }],
        subject: "Password Reset Successful",
        html: "Your password has been reset successfully.",
        category: "Password Reset",
      });
    });

    it("should log success message", async () => {
      (mockMailtrapClient.send as jest.Mock).mockResolvedValue({ success: true });

      await sendResetSuccessEmail("user@test.com");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Password reset email sent successfully",
        { success: true }
      );
    });

    it("should throw error when send fails", async () => {
      (mockMailtrapClient.send as jest.Mock).mockRejectedValue(new Error("Send failed"));

      await expect(sendResetSuccessEmail("user@test.com")).rejects.toThrow(
        "Error sending password reset success email: Error: Send failed"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error sending password reset success email",
        expect.any(Error)
      );
    });
  });
});
