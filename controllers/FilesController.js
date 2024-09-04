import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import fs from 'fs';
import mime from 'mime-types';
import Queue from 'bull';


class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    let parentFile = null;
    if (parentId !== '0') {
      parentFile = await dbClient.db.collection('files').findOne({ _id: new ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileDocument = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId,
      localPath: null,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileUUID = uuidv4();
    const localPath = path.join(folderPath, fileUUID);

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileDocument);

    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    });

    static async getShow(req, res) {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
	    
      const file = await dbClient.db.collection('files').findOne({
        _id: dbClient.ObjectId(req.params.id),
        userId: userId
      });

      if (!file) {
	return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file);
    }

    static async getIndex(req, res) {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { parentId = '0', page = 0 } = req.query;
      const limit = 20;
      const skip = page * limit;

      const files = await dbClient.d;collection('files').find({
        userId: userId,
	parentId: parentId
      }).skip(skip).limit(limit).toArray();

      return res.status(200).json(files);
    }
    
    static async putPublish(req, res) {
      const tokent = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await dbClient.db.collection('files').findOneAndUpdate({
        _id: dbClient.ObjectId(req.params.id),
	userId: userId
      }, {
        $set: { isPublic: true }
      }, { returnOriginal: false });

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file.value);
    }

    static async putUnpublish(req, res) {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.db.collection('files').findOneAndUpdate({
      _id: dbClient.ObjectId(req.params.id),
      userId: userId
    }, {
      $set: { isPublic: false }
    }, { returnOriginal: false });

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }
  
  static async getFile(req, res) {
    const token = req.headers['x-token'];
    let userId = null;
    if (token) {
      userId = await redisClient.get(`auth_${token}`);
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: dbClient.ObjectId(req.paramas.id)
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (!userId || userId !== file.userId.toString())) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    const filePath = path.join(file.localPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    res.contentType(mimeType);
    res.sendFile(filePath);
  }

    const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

    if (type === 'image') {
      const jobId = uuidv4();  // Ensure a unique job ID
      fileQueue.add({ userId, fileId: newFile.id.toString() }, { jobId });
    }
}

export default FilesController;
