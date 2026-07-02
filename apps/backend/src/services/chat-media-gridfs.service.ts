import mongoose from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';

const BUCKET_NAME = 'chatMedia';

function getBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB não conectado.');
  }
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

function toObjectId(gridFsId: string): ObjectId {
  if (!ObjectId.isValid(gridFsId)) {
    throw new Error('ID de mídia inválido.');
  }
  return new ObjectId(gridFsId);
}

export interface SaveIncomingMediaInput {
  instanceId: string;
  messageId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export async function saveIncomingMedia(
  input: SaveIncomingMediaInput,
): Promise<{ gridFsId: string }> {
  const bucket = getBucket();
  const filename = `${input.instanceId}/${input.messageId}`;

  const existing = await bucket.find({ filename }).limit(1).toArray();
  if (existing.length > 0) {
    return { gridFsId: String(existing[0]._id) };
  }

  const uploadStream = bucket.openUploadStream(filename, {
    contentType: input.mimeType || 'application/octet-stream',
    metadata: {
      instanceId: input.instanceId,
      messageId: input.messageId,
      fileName: input.fileName,
    },
  });

  await new Promise<void>((resolve, reject) => {
    Readable.from(input.buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve());
  });

  return { gridFsId: String(uploadStream.id) };
}

export async function readMedia(
  gridFsId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const bucket = getBucket();
  const objectId = toObjectId(gridFsId);

  const files = await bucket.find({ _id: objectId }).limit(1).toArray();
  if (files.length === 0) {
    throw new Error('Mídia não encontrada no GridFS.');
  }

  const file = files[0];
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    bucket
      .openDownloadStream(objectId)
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => resolve());
  });

  return {
    buffer: Buffer.concat(chunks),
    mimeType: file.contentType ?? 'application/octet-stream',
  };
}

export async function deleteMedia(gridFsId: string): Promise<void> {
  const bucket = getBucket();
  await bucket.delete(toObjectId(gridFsId));
}
