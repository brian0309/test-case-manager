import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
	try {
		console.log("mongo_uri: ", process.env.MONGO_URI);
		const conn = await mongoose.connect(process.env.MONGO_URI as string, {
			// Connection pool settings for better performance
			maxPoolSize: 10, // Maximum number of connections in the pool
			minPoolSize: 2,  // Minimum number of connections to maintain
			socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
			serverSelectionTimeoutMS: 5000, // Timeout for selecting a server
			family: 4 // Use IPv4, skip trying IPv6
		});
		console.log(`MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.log("Error connection to MongoDB: ", (error as Error).message);
		process.exit(1); // 1 is failure, 0 status code is success
	}
};
