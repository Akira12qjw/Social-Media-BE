import { Request } from "express";
import sharp from "sharp";
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from "~/constants/dir";
import path from "path";
import fsPromise from "fs/promises";
import { envConfig, isProduction } from "~/constants/config";
import { EncodingStatus, MediaType } from "~/constants/enums";
import { Media } from "~/models/other";
import { encodeHLSWithMultipleVideoStreams } from "~/utils/video";
import databaseService from "~/services/database.services";
import VideoStatus from "~/models/schemas/VideoStatus.schema";
import { uploadFileToS3 } from "~/utils/s3";
import { CompleteMultipartUploadCommandOutput } from "@aws-sdk/client-s3";
import { rimrafSync } from "rimraf";
import {
  getFiles,
  getNameFromFullName,
  handleUploadImage,
  handleUploadVideo,
} from "~/utils/files";

class Queue {
  items: string[];
  encoding: boolean;
  constructor() {
    this.items = [];
    this.encoding = false;
  }
  async enqueue(item: string) {
    this.items.push(item);
    // item = /home/duy/Downloads/12312312/1231231221.mp4
    const idName = getNameFromFullName(item.split("/").pop() as string);
    await databaseService.videoStatus.insertOne(
      new VideoStatus({
        name: idName,
        status: EncodingStatus.Pending,
      })
    );
    this.processEncode();
  }
  async processEncode() {
    if (this.encoding) return;
    if (this.items.length > 0) {
      this.encoding = true;
      const videoPath = this.items[0];
      const idName = getNameFromFullName(videoPath.split("/").pop() as string);
      await databaseService.videoStatus.updateOne(
        {
          name: idName,
        },
        {
          $set: {
            status: EncodingStatus.Processing,
          },
          $currentDate: {
            updated_at: true,
          },
        }
      );
      try {
        this.items.shift();
        await encodeHLSWithMultipleVideoStreams(videoPath);
        const files = getFiles(path.resolve(UPLOAD_VIDEO_DIR, idName));
        const mime = await import("mime");
        await Promise.all(
          files.map((filepath) => {
            // filepath: /Users/duthanhduoc/Documents/DuocEdu/NodeJs-Super/Twitter/uploads/videos/6vcpA2ujL7EuaD5gvaPvl/v0/fileSequence0.ts
            const filename =
              "videos-hls" +
              filepath.replace(path.resolve(UPLOAD_VIDEO_DIR), "");
            return uploadFileToS3({
              filepath,
              filename,
              contentType: mime.default.getType(filepath) as string,
            });
          })
        );
        rimrafSync(path.resolve(UPLOAD_VIDEO_DIR, idName));
        await databaseService.videoStatus.updateOne(
          {
            name: idName,
          },
          {
            $set: {
              status: EncodingStatus.Success,
            },
            $currentDate: {
              updated_at: true,
            },
          }
        );
        console.log(`Encode video ${videoPath} success`);
      } catch (error) {
        await databaseService.videoStatus
          .updateOne(
            {
              name: idName,
            },
            {
              $set: {
                status: EncodingStatus.Failed,
              },
              $currentDate: {
                updated_at: true,
              },
            }
          )
          .catch((err) => {
            console.error("Update video status error", err);
          });
        console.error(`Encode video ${videoPath} error`);
        console.error(error);
      }
      this.encoding = false;
      this.processEncode();
    } else {
      console.log("Encode video queue is empty");
    }
  }
}

const queue = new Queue();

class MediasService {
  async uploadImage(req: Request) {
    const files = await handleUploadImage(req);
    const mime = await import("mime");
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullName(file.newFilename);
        const newFullFilename = `${newName}.jpg`;
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, newFullFilename);

        try {
          // Process image
          await sharp(file.filepath).jpeg().toFile(newPath);

          // Upload to S3
          const s3Result = await uploadFileToS3({
            filename: "images/" + newFullFilename,
            filepath: newPath,
            contentType: mime.default.getType(newPath) as string,
          });

          // Add a small delay to ensure file handles are closed
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Delete files with error handling
          await Promise.all([
            fsPromise
              .unlink(file.filepath)
              .catch((err) => console.error("Error deleting temp file:", err)),
            fsPromise
              .unlink(newPath)
              .catch((err) =>
                console.error("Error deleting processed file:", err)
              ),
          ]);

          return {
            url: (s3Result as CompleteMultipartUploadCommandOutput)
              .Location as string,
            type: MediaType.Image,
          };
        } catch (error) {
          // Clean up files in case of error
          try {
            await fsPromise.unlink(file.filepath);
            await fsPromise.unlink(newPath);
          } catch (cleanupError) {
            console.error("Error during cleanup:", cleanupError);
          }
          throw error;
        }
      })
    );
    return result;
  }

  async uploadVideo(req: Request) {
    const files = await handleUploadVideo(req);
    const mime = await import("mime");
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const s3Result = await uploadFileToS3({
          filename: "videos/" + file.newFilename,
          contentType: mime.default.getType(file.filepath) as string,
          filepath: file.filepath,
        });
        fsPromise.unlink(file.filepath);
        return {
          url: (s3Result as CompleteMultipartUploadCommandOutput)
            .Location as string,
          type: MediaType.Video,
        };
        // return {
        //   url: isProduction
        //     ? `${process.env.HOST}/static/video/${file.newFilename}`
        //     : `http://localhost:${process.env.PORT}/static/video/${file.newFilename}`,
        //   type: MediaType.Video
        // }
      })
    );
    return result;
  }
  async uploadVideoHLS(req: Request) {
    const files = await handleUploadVideo(req);
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFullName(file.newFilename);
        queue.enqueue(file.filepath);
        return {
          url: isProduction
            ? `${envConfig.host}/static/video-hls/${newName}/master.m3u8`
            : `http://localhost:${envConfig.port}/static/video-hls/${newName}/master.m3u8`,
          type: MediaType.HLS,
        };
      })
    );
    return result;
  }
  async getVideoStatus(id: string) {
    const data = await databaseService.videoStatus.findOne({ name: id });
    return data;
  }
}

const mediasService = new MediasService();

export default mediasService;
