import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { setServers } from "node:dns/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DNS_OVERRIDE_SERVERS = (process.env.DNS_OVERRIDE_SERVERS || "1.1.1.1,8.8.8.8")
  .split(",")
  .map((server) => server.trim())
  .filter(Boolean);

// Old status values that should be migrated to "Ready"
const OLD_STATUSES_TO_MIGRATE = [
  "Ready for Testing",
  "In Progress",
  "Passed",
  "Failed",
  "Blocked",
  "Retest",
  "Pass - Fixed",
  "Skipped",
  "Out of Scope",
];

const NEW_STATUS = "Ready";
const KEEP_STATUS = "Draft";

async function migrateStatuses(dryRun: boolean = true): Promise<void> {
  try {
    console.log(`\n=== Test Case Status Migration ===`);
    console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
    console.log(`\nConnecting to MongoDB...`);

    await setServers(DNS_OVERRIDE_SERVERS);
    await mongoose.connect(process.env.MONGO_URI as string, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
    });
    console.log("Connected to MongoDB.\n");

    const db = mongoose.connection.db!;
    const collection = db.collection("testcases");

    // Count documents that will be affected
    const countFilter = { status: { $in: OLD_STATUSES_TO_MIGRATE } };
    const totalCount = await collection.countDocuments(countFilter);
    console.log(`Found ${totalCount} test cases to migrate (non-Draft statuses).`);

    // Count documents that will stay unchanged
    const draftCount = await collection.countDocuments({ status: KEEP_STATUS });
    console.log(`Found ${draftCount} test cases with Draft status (will remain unchanged).`);

    // Count documents already with new status
    const readyCount = await collection.countDocuments({ status: NEW_STATUS });
    console.log(`Found ${readyCount} test cases already with Ready status.`);

    // Show breakdown by old status
    console.log("\nBreakdown of test cases to migrate:");
    for (const oldStatus of OLD_STATUSES_TO_MIGRATE) {
      const count = await collection.countDocuments({ status: oldStatus });
      if (count > 0) {
        console.log(`  - "${oldStatus}": ${count} test cases`);
      }
    }

    if (totalCount === 0) {
      console.log("\nNo test cases to migrate. Exiting.");
      await mongoose.disconnect();
      return;
    }

    if (dryRun) {
      console.log(`\n=== DRY RUN COMPLETE ===`);
      console.log(`Run with --live flag to apply changes.`);
      await mongoose.disconnect();
      return;
    }

    // Perform the migration
    console.log(`\nMigrating ${totalCount} test cases to "${NEW_STATUS}"...`);
    const result = await collection.updateMany(countFilter, {
      $set: { status: NEW_STATUS },
    });

    console.log(`\nMigration complete!`);
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);

    // Verify migration
    const remainingOld = await collection.countDocuments(countFilter);
    console.log(`\nVerification: ${remainingOld} test cases with old statuses remaining.`);

    if (remainingOld === 0) {
      console.log("✓ All test cases successfully migrated.");
    } else {
      console.log("⚠ Warning: Some test cases were not migrated. Check logs.");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes("--live");

if (dryRun) {
  console.log("Running in DRY RUN mode. No changes will be made.");
  console.log("Use --live flag to apply changes.\n");
}

migrateStatuses(dryRun);
