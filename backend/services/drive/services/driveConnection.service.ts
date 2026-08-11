import { User } from "../../../models/user.model.js";
import { IGoogleDriveConnection } from "../../../types/user.types.js";
import { DriveConnectionInfo } from "../types/drive.types.js";
import { encryptDriveToken, decryptDriveToken } from "./tokenCrypto.js";
import { revokeDriveToken } from "./driveOAuth.service.js";

/**
 * Reads the user's Google Drive connection, never exposing the refresh token.
 */
export const getDriveConnection = async (
  userId: string
): Promise<DriveConnectionInfo> => {
  const user = await User.findById(userId).select("googleDrive");
  const connection = user?.googleDrive as IGoogleDriveConnection | undefined;

  if (!connection?.googleEmail) {
    return { connected: false };
  }

  return {
    connected: true,
    googleEmail: connection.googleEmail,
    connectedAt: connection.connectedAt?.toISOString(),
  };
};

/**
 * Stores the user's Google Drive connection with an encrypted refresh token.
 */
export const saveDriveConnection = async (
  userId: string,
  data: { refreshToken: string; googleId: string; googleEmail: string }
): Promise<void> => {
  const encrypted = encryptDriveToken(data.refreshToken);

  await User.findByIdAndUpdate(userId, {
    $set: {
      "googleDrive.refreshToken": encrypted,
      "googleDrive.googleId": data.googleId,
      "googleDrive.googleEmail": data.googleEmail,
      "googleDrive.connectedAt": new Date(),
      "googleDrive.folders": {},
    },
  });
};

/**
 * Loads the encrypted refresh token so the OAuth service can mint access tokens.
 * Returns null when the user has never connected Google Drive.
 */
export const getEncryptedDriveToken = async (
  userId: string
): Promise<string | null> => {
  const user = await User.findById(userId).select("googleDrive.refreshToken");
  return (user?.googleDrive?.refreshToken as string | undefined) || null;
};

/**
 * Decrypts an encrypted refresh token.
 */
export const decryptRefreshToken = (encrypted: string): string => {
  return decryptDriveToken(encrypted);
};

/**
 * Disconnects the user's Google Drive: revokes the token and clears stored data.
 * Does NOT delete any Drive files.
 */
export const disconnectDrive = async (userId: string): Promise<void> => {
  const user = await User.findById(userId).select("googleDrive.refreshToken");

  const encrypted = user?.googleDrive?.refreshToken as string | undefined;
  if (encrypted) {
    try {
      await revokeDriveToken(decryptDriveToken(encrypted));
    } catch {
      // Continue disconnecting even if revocation fails.
    }
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      "googleDrive.refreshToken": null,
      "googleDrive.googleId": null,
      "googleDrive.googleEmail": null,
      "googleDrive.connectedAt": null,
      "googleDrive.folders": {},
    },
  });
};