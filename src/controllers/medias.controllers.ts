import { NextFunction, Request, Response } from "express";
import path from "path";
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from "~/constants/dir";
import HTTP_STATUS from "~/constants/httpStatus";
import { USERS_MESSAGES } from "~/constants/messages";
import mediasService from "~/services/medias.services";
import { handleUploadImage } from "~/utils/files";
import fs from "fs";
import { sendFileFromS3 } from "~/utils/s3";

console.log(path.resolve("uploads"));

export const uploadImageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const url = await mediasService.uploadImage(req);
  return res.json({
    message: USERS_MESSAGES.UPLOAD_SUCCESS,
    result: url,
  });
};

export const uploadVideoController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const url = await mediasService.uploadVideo(req);
  return res.json({
    message: USERS_MESSAGES.UPLOAD_SUCCESS,
    result: url,
  });
};

export const uploadVideoHLSController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const url = await mediasService.uploadVideoHLS(req);
  return res.json({
    message: USERS_MESSAGES.UPLOAD_SUCCESS,
    result: url,
  });
};

export const videoStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const result = await mediasService.getVideoStatus(id as string);
  return res.json({
    message: USERS_MESSAGES.GET_VIDEO_STATUS_SUCCESS,
    result: result,
  });
};

export const serveImageController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name } = req.params;

  return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, name), (err) => {
    if (err) {
      res.status((err as any).status).send("Not Found");
    }
  });
};

export const serveM3u8Controller = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  sendFileFromS3(res, `videos-hls/${id}/master.m3u8`);
  // return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, 'master.m3u8'), (err) => {
  //   if (err) {
  //     res.status((err as any).status).send('Not found')
  //   }
  // })
};

export const serveSegmentController = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id, v, segment } = req.params;
  sendFileFromS3(res, `videos-hls/${id}/${v}/${segment}`);

  // return res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, v, segment), (err) => {
  //   if (err) {
  //     res.status((err as any).status).send('Not found')
  //   }
  // })
};

export const serveVideoStreamController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const range = req.headers.range;
  if (!range) {
    return res.status(HTTP_STATUS.BAD_REQUEST).send("Requires Range header");
  }
  const { name } = req.params;
  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, name);
  //1MB = 10^6 bytes

  //Dung lượng video
  const videoSize = fs.statSync(videoPath).size;
  //Dung lượng video cho mỗi phân đoạn stream
  const chunkSize = 10 ** 6; // 1MB
  // Lấy giá trị byte bắt đầu từ header Range
  const start = Number(range.replace(/\D/g, ""));
  //Lấy giá trị byte kết thúc, vượt quá dung lượng video thì lấy giá trị videoSize
  const end = Math.min(start + chunkSize, videoSize - 1);

  const contentLength = end - start + 1;
  const mime = await import("mime");
  const contentType = mime.default.getType(videoPath) || "video/*";
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Range": "bytes",
    "Content-Length": contentLength,
    "Content-Type": contentType,
  };
  res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers);
  const videoStreams = fs.createReadStream(videoPath, { start, end });
  videoStreams.pipe(res);
};
