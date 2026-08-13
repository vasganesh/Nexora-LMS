import { minioClient, MINIO_BUCKET } from '../server/lib/minio.js';
import { ListBucketsCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

async function main() {
  try {
    console.log("Attempting to connect to MinIO...");
    const data = await minioClient.send(new ListBucketsCommand({}));
    console.log("Successfully connected to MinIO!");
    console.log("Buckets present:", data.Buckets?.map(b => b.Name).join(', ') || 'none');

    // Check if the lms-files bucket exists
    try {
      await minioClient.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
      console.log(`Bucket "${MINIO_BUCKET}" exists.`);
    } catch (headErr: any) {
      if (headErr.name === 'NotFound' || headErr.$metadata?.httpStatusCode === 404) {
        console.log(`Bucket "${MINIO_BUCKET}" does not exist. Attempting to create it...`);
        await minioClient.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
        console.log(`Successfully created bucket "${MINIO_BUCKET}".`);
      } else {
        throw headErr;
      }
    }
  } catch (err: any) {
    console.error("Failed to connect or configure MinIO:", err.message || err);
  }
}

main().catch(console.error);
