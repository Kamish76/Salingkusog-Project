/**
 * Configures S3 CORS policy on the Neon Object Storage bucket
 * to allow direct browser canvas drawing with crossOrigin = "anonymous",
 * eliminating server-side image proxying and duplicate data transfer.
 */

import { PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { getStorageClient, STORAGE_BUCKET, isStorageConfigured } from "../src/lib/storage";

export async function configureStorageCors() {
  if (!isStorageConfigured()) {
    console.log("ℹ Storage credentials not set in environment; skipping bucket CORS update.");
    return;
  }

  const client = getStorageClient();
  try {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: STORAGE_BUCKET,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "HEAD"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.log(`✔ Successfully applied CORS policy on bucket "${STORAGE_BUCKET}"`);

    const getRes = await client.send(new GetBucketCorsCommand({ Bucket: STORAGE_BUCKET }));
    console.log("  Active CORS rules:", JSON.stringify(getRes.CORSRules));
  } catch (err) {
    console.error("Failed to update bucket CORS policy:", (err as Error).message);
  }
}

if (process.argv[1]?.endsWith("configure-bucket-cors.ts")) {
  configureStorageCors().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
