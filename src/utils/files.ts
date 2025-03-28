import path, { resolve } from "path";
import fs from "fs";
import { Request } from "express";
import { File } from "formidable";
import {
  UPLOAD_IMAGE_DIR,
  UPLOAD_IMAGE_TEMP_DIR,
  UPLOAD_VIDEO_DIR,
  UPLOAD_VIDEO_TEMP_DIR,
} from "../constants/dir";
import { isProduction } from "../constants/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { envConfig } from "../constants/config";
// const nanoid = require("nanoid/non-secure");

const s3Client = new S3Client({
  region: envConfig.awsRegion,
  credentials: {
    accessKeyId: envConfig.awsAccessKeyId,
    secretAccessKey: envConfig.awsSecretAccessKey,
  },
});

export const initFolder = () => {
  // Skip folder creation in production (Vercel)
  if (isProduction) {
    return;
  }

  [UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true, // tạo folder nếu chưa có
      });
    }
  });
};

export const handleUploadImage = async (req: Request) => {
  const formidalble = (await import("formidable")).default;

  if (isProduction) {
    // Handle S3 upload in production
    const form = formidalble({
      maxFiles: 4,
      maxFileSize: 300 * 1024,
      maxTotalFileSize: 300 * 1024 * 4,
      filter: function ({ name, originalFilename, mimetype }) {
        const valid = name === "image" && Boolean(mimetype?.includes("image/"));
        if (!valid) {
          form.emit("error" as any, new Error("File type is not valid") as any);
        }
        return valid;
      },
    });

    return new Promise<File[]>((resolve, reject) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        if (!files.image) {
          return reject(new Error("File is empty"));
        }

        try {
          const uploadedFiles = files.image as File[];
          for (const file of uploadedFiles) {
            const fileContent = fs.readFileSync(file.filepath);
            const key = `images/${Date.now()}-${file.originalFilename}`;

            await s3Client.send(
              new PutObjectCommand({
                Bucket: envConfig.s3BucketName,
                Key: key,
                Body: fileContent,
                ContentType: file.mimetype || "image/jpeg",
              })
            );

            // Update file path to S3 URL
            file.filepath = `https://${envConfig.s3BucketName}.s3.${envConfig.awsRegion}.amazonaws.com/${key}`;
          }
          resolve(uploadedFiles);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Local upload for development
  const form = formidalble({
    uploadDir: UPLOAD_IMAGE_TEMP_DIR,
    maxFiles: 4,
    keepExtensions: true,
    maxFileSize: 300 * 1024,
    maxTotalFileSize: 300 * 1024 * 4,
    filter: function ({ name, originalFilename, mimetype }) {
      const valid = name === "image" && Boolean(mimetype?.includes("image/"));
      if (!valid) {
        form.emit("error" as any, new Error("File type is not valid") as any);
      }
      return valid;
    },
  });

  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      if (!files.image) {
        return reject(new Error("File is empty"));
      }
      resolve(files.image as File[]);
    });
  });
};

export const handleUploadVideo = async (req: Request) => {
  const formidalble = (await import("formidable")).default;
  const nanoId = (await import("nanoid")).nanoid;
  const idName = nanoId();
  const folderPath = path.resolve(UPLOAD_VIDEO_DIR, idName);
  fs.mkdirSync(folderPath);
  const form = formidalble({
    uploadDir: folderPath,
    maxFiles: 1,
    maxFileSize: 50 * 1024 * 1024,
    filter: function ({ name, originalFilename, mimetype }) {
      const valid =
        name === "video" &&
        Boolean(mimetype?.includes("mp4") || mimetype?.includes("quicktime"));
      if (!valid) {
        form.emit("error" as any, new Error("File type is not valid") as any);
      }
      return valid;
    },
    filename: function (filename, ext) {
      return idName + ext;
    },
  });
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      if (!Boolean(files.video)) {
        return reject(new Error("File is empty"));
      }
      const videos = files.video as File[];
      videos.forEach((video) => {
        const ext = getExtension(video.originalFilename as string);
        fs.renameSync(video.filepath, video.filepath + "." + ext);
        video.newFilename = video.newFilename + "." + ext;
        video.filepath = video.filepath + "." + ext;
      });
      resolve(files.video as File[]);
    });
  });
};

export const getNameFromFullName = (fullname: string) => {
  const namearr = fullname.split(".");
  namearr.pop();
  return namearr.join("");
};

export const getExtension = (fullname: string) => {
  const namearr = fullname.split(".");
  return namearr[namearr.length - 1];
};

export const getFiles = (dir: string, files: string[] = []) => {
  // Get an array of all files and directories in the passed directory using fs.readdirSync
  const fileList = fs.readdirSync(dir);
  // Create the full path of the file/directory by concatenating the passed directory and file/directory name
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    // Check if the current file/directory is a directory using fs.statSync
    if (fs.statSync(name).isDirectory()) {
      // If it is a directory, recursively call the getFiles function with the directory path and the files array
      getFiles(name, files);
    } else {
      // If it is a file, push the full path to the files array
      files.push(name);
    }
  }
  return files;
};
