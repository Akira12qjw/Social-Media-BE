import { S3, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { config } from "dotenv";
import { Response } from "express";
import fs from "fs";
import path from "path";
import { envConfig } from "../constants/config";
import HTTP_STATUS from "../constants/httpStatus";
config();
const s3 = new S3({
  region: process.env.AWS_REGION,
  credentials: {
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  },
});

export const uploadFileToS3 = ({
  filename,
  filepath,
  contentType,
}: {
  filename: string;
  filepath: string;
  contentType: string;
}) => {
  const parallelUploads3 = new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET_NAME as string,
      Key: filename,
      Body: fs.readFileSync(filepath),
      ContentType: contentType,
    },

    // optional tags
    tags: [
      /*...*/
    ],
    queueSize: 4,
    // (optional) size of each part, in bytes, at least 5MB
    partSize: 1024 * 1024 * 5,

    leavePartsOnError: false,
  });
  return parallelUploads3.done();
};

export const sendFileFromS3 = async (res: Response, filepath: string) => {
  try {
    const data = await s3.getObject({
      Bucket: envConfig.s3BucketName,
      Key: filepath,
    });
    (data.Body as any).pipe(res);
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).send("Not found");
  }
};
// parallelUploads3.on("httpUploadProgress", (progress) => {
//   console.log(progress);
// });

// parallelUploads3.done().then((res) => {
//   console.log(res);
// });
