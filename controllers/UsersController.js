import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;
    
        if (!email) return res.status(400).send({ error: 'Missing email' });
        if (!password) return res.status(400).send({ error: 'Missing password' });
    
        const userExists = await dbClient.users.find({ email });
        if (userExists) return res.status(400).send({ error: 'Already exist' });
        password = await bcrypt.hash(password, 10);
    
        const user = await dbClient.users.insert({ email, password });
    
        return res.status(201).send({ id: user.id, email });
    }
}

export default UsersController;
