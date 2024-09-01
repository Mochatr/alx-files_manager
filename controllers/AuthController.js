import redisClient from "../utils/redis";


class AuthController {
  static async getConnect(req, res){
    const authHeader = req.header('Authorization') || '';
    const base64Credentials = authHeader.split(' ')[1];

    if (!base64Credentials) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [email, password] = credentials.split(':');

      const user = await dbClient.db.collection('users').findOne({
        email,
        password: sha1(password)
      });
  
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400);
  
      return res.status(200).json({ token });
  }

  static async getDisconnect(req, res){
    const token = req.header('Authorization').split(' ')[1];
    const key = `auth_${token}`;
    
    const userId = await redisClient.get(key);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
        }
        await redisClient.del(key);
        return res.status(204).send();
  }
}

export default AuthController;
