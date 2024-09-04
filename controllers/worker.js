import Queue from 'bull';
import dbClient from './utils/db';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import path from 'path';


const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId || !userId) {
    done(new Error('Missing fileId or userId'));
    return;
  }

  const file = await dbClient.db.collection('files').findOne({ _id: dbClient.ObjectId(fileId), userId });
  if (!file) {
    done(new Error('File not found'));
    return;
  }

  const filePath = file.localPath;
  const sizes = [100, 250, 500];
  sizes.forEach(async (size) => {
    try {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      fs.writeFileSync(`${filePath}_${size}`, thumbnail);
    } catch (error) {
      done(error);
    }
  });

  done();
});

console.log('Worker started');
