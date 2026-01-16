// Mock mongoose
const mockConnection = {
  host: "localhost",
};

jest.mock("mongoose", () => ({
  connect: jest.fn(),
  connection: {
    collections: {},
    dropDatabase: jest.fn(),
    close: jest.fn(),
  },
}));

import mongoose from "mongoose";
import { connectDB } from "../../../db/connectDB.js";

const mockMongoose = mongoose as any;

describe("connectDB", () => {
  let consoleLogSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should connect to MongoDB successfully", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/testdb";
    
    (mockMongoose.connect as jest.Mock).mockResolvedValue({
      connection: {
        host: "localhost",
      },
    });

    await connectDB();

    expect(mockMongoose.connect).toHaveBeenCalledWith(
      "mongodb://localhost:27017/testdb",
      {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        family: 4,
      }
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("MongoDB Connected: localhost");
  });

  it("should log MONGO_URI", async () => {
    process.env.MONGO_URI = "mongodb://test:27017/db";
    
    (mockMongoose.connect as jest.Mock).mockResolvedValue({
      connection: {
        host: "test",
      },
    });

    await connectDB();

    expect(consoleLogSpy).toHaveBeenCalledWith("mongo_uri: ", "mongodb://test:27017/db");
  });

  it("should exit process on connection error", async () => {
    process.env.MONGO_URI = "mongodb://localhost:27017/testdb";
    
    (mockMongoose.connect as jest.Mock).mockRejectedValue(new Error("Connection failed"));

    await expect(connectDB()).rejects.toThrow("process.exit called");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Error connection to MongoDB: ",
      "Connection failed"
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle undefined MONGO_URI", async () => {
    delete process.env.MONGO_URI;
    
    // When MONGO_URI is undefined, mongoose.connect should be called with undefined
    (mockMongoose.connect as jest.Mock).mockResolvedValue({
      connection: {
        host: "undefined-host",
      },
    });

    await connectDB();

    expect(consoleLogSpy).toHaveBeenCalledWith("mongo_uri: ", undefined);
  });
});
