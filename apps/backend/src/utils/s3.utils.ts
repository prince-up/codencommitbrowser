import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client configured for AWS or an S3-compatible store (like MinIO)
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dev-key',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dev-secret'
  },
  // endpoint: process.env.S3_ENDPOINT // useful if using local MinIO
});

export const generatePresignedUrl = async (key: string, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || 'codenbrowser-storage',
    Key: key,
    ContentType: contentType
  });
  
  // URL expires in 15 minutes, tightly scoping the access window
  return getSignedUrl(s3Client, command, { expiresIn: 900 });
};
