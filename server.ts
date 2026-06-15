import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db, { initDB } from './src/db/sqlite.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(express.json({ limit: '50mb' })); // Allow large image payloads
  
  // init sqlite
  initDB();

  // ----- MIDDLEWARE/AUTH MOCK -----
  // In a real app we'd use JWT/sessions.
  // Since this is fully offline/local, the frontend will just send the current 'userId' in a header.
  app.use((req, res, next) => {
    const userIdHeader = req.headers['x-user-id'];
    if (userIdHeader) {
      (req as any).userId = parseInt(userIdHeader as string, 10);
    }
    next();
  });

  // ========== API ROUTES ==========

  // --- Users ---
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, fullName, bio, avatar, createdAt FROM users').all();
    res.json(users);
  });
  
  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare('SELECT id, username, fullName, bio, avatar, createdAt FROM users WHERE id = ?').get(req.params.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const stats = {
      posts: (db.prepare('SELECT COUNT(*) as c FROM posts WHERE userId = ?').get(req.params.id) as any).c,
      followers: (db.prepare('SELECT COUNT(*) as c FROM follows WHERE followingId = ?').get(req.params.id) as any).c,
      following: (db.prepare('SELECT COUNT(*) as c FROM follows WHERE followerId = ?').get(req.params.id) as any).c
    };

    let isFollowing = false;
    if ((req as any).userId) {
       const follow = db.prepare('SELECT 1 FROM follows WHERE followerId = ? AND followingId = ?').get((req as any).userId, req.params.id);
       isFollowing = !!follow;
    }

    res.json({ ...user, ...stats, isFollowing });
  });

  app.put('/api/users/me', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { username, fullName, bio, avatar } = req.body;
    db.prepare(`
      UPDATE users 
      SET username = ?, fullName = ?, bio = ?, avatar = ? 
      WHERE id = ?
    `).run(username, fullName, bio, avatar, currentUserId);
    
    const updatedUser = db.prepare('SELECT id, username, fullName, bio, avatar FROM users WHERE id = ?').get(currentUserId);
    res.json(updatedUser);
  });

  app.post('/api/users', (req, res) => {
    const { username, fullName, bio, avatar } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO users (username, fullName, bio, avatar) VALUES (?, ?, ?, ?)');
      const info = stmt.run(username, fullName, bio || '', avatar || '');
      res.json({ id: info.lastInsertRowid, username, fullName, bio, avatar });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    const { username, fullName, bio, avatar } = req.body;
    try {
      const stmt = db.prepare('UPDATE users SET username=?, fullName=?, bio=?, avatar=? WHERE id=?');
      stmt.run(username, fullName, bio, avatar, req.params.id);
      res.json({ success: true });
    } catch(err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
      db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
      res.json({ success: true });
  });

  // --- Follows ---
  app.post('/api/users/:id/follow', (req, res) => {
    const currentUserId = (req as any).userId;
    const targetUserId = parseInt(req.params.id);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    if (currentUserId === targetUserId) return res.status(400).json({ error: 'Cannot follow self' });

    try {
      db.prepare('INSERT INTO follows (followerId, followingId) VALUES (?, ?)').run(currentUserId, targetUserId);
      db.prepare('INSERT INTO notifications (userId, senderId, type) VALUES (?, ?, ?)').run(targetUserId, currentUserId, 'follow');
      res.json({ success: true, following: true });
    } catch(err) {
      // Ignore if already following
      res.json({ success: true, following: true });
    }
  });

  app.post('/api/users/:id/unfollow', (req, res) => {
    const currentUserId = (req as any).userId;
    const targetUserId = parseInt(req.params.id);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM follows WHERE followerId = ? AND followingId = ?').run(currentUserId, targetUserId);
    res.json({ success: true, following: false });
  });

  app.get('/api/users/:id/followers', (req, res) => {
    const followers = db.prepare(`
      SELECT u.id, u.username, u.fullName, u.avatar
      FROM follows f
      JOIN users u ON f.followerId = u.id
      WHERE f.followingId = ?
    `).all(req.params.id);
    res.json(followers);
  });

  app.get('/api/users/:id/following', (req, res) => {
    const following = db.prepare(`
      SELECT u.id, u.username, u.fullName, u.avatar
      FROM follows f
      JOIN users u ON f.followingId = u.id
      WHERE f.followerId = ?
    `).all(req.params.id);
    res.json(following);
  });

  // --- Posts ---
  app.get('/api/posts', (req, res) => {
    // Return all feed. Optionally filter by followed users
    const currentUserId = (req as any).userId;
    
    let posts;
    if (currentUserId && req.query.feed === 'following') {
      posts = db.prepare(`
        SELECT p.*, u.username, u.avatar 
        FROM posts p
        JOIN users u ON p.userId = u.id
        LEFT JOIN follows f ON p.userId = f.followingId
        WHERE f.followerId = ? OR p.userId = ?
        ORDER BY p.createdAt DESC
      `).all(currentUserId, currentUserId);
    } else if (req.query.userId) {
       posts = db.prepare(`
        SELECT p.*, u.username, u.avatar 
        FROM posts p
        JOIN users u ON p.userId = u.id
        WHERE p.userId = ?
        ORDER BY p.createdAt DESC
      `).all(req.query.userId);
    } else {
      posts = db.prepare(`
        SELECT p.*, u.username, u.avatar 
        FROM posts p
        JOIN users u ON p.userId = u.id
        ORDER BY p.createdAt DESC
      `).all();
    }

    // Enrich with likes and comments
    const enriched = posts.map((post: any) => {
      const likesCount = (db.prepare('SELECT COUNT(*) as c FROM likes WHERE postId = ?').get(post.id) as any).c;
      const commentsCount = (db.prepare('SELECT COUNT(*) as c FROM comments WHERE postId = ?').get(post.id) as any).c;
      
      let isLiked = false;
      if (currentUserId) {
        isLiked = !!db.prepare('SELECT 1 FROM likes WHERE postId = ? AND userId = ?').get(post.id, currentUserId);
      }

       // Get latest 2 comments
       const recentComments = db.prepare(`
         SELECT c.*, u.username 
         FROM comments c
         JOIN users u ON c.userId = u.id
         WHERE c.postId = ?
         ORDER BY c.createdAt ASC LIMIT 2
       `).all(post.id);

      return { ...post, likesCount, commentsCount, isLiked, recentComments };
    });

    res.json(enriched);
  });

  app.get('/api/posts/:id', (req, res) => {
      const currentUserId = (req as any).userId;
      const post: any = db.prepare(`
        SELECT p.*, u.username, u.avatar 
        FROM posts p
        JOIN users u ON p.userId = u.id
        WHERE p.id = ?
      `).get(req.params.id);

      if(!post) return res.status(404).json({error: 'Post not found'});

      const likesCount = (db.prepare('SELECT COUNT(*) as c FROM likes WHERE postId = ?').get(post.id) as any).c;
      let isLiked = false;
      if (currentUserId) {
        isLiked = !!db.prepare('SELECT 1 FROM likes WHERE postId = ? AND userId = ?').get(post.id, currentUserId);
      }

      const comments = db.prepare(`
         SELECT c.*, u.username, u.avatar 
         FROM comments c
         JOIN users u ON c.userId = u.id
         WHERE c.postId = ?
         ORDER BY c.createdAt ASC
       `).all(post.id);

      res.json({...post, likesCount, isLiked, comments});
  });

  app.post('/api/posts', (req, res) => {
    const { imageUrl, caption } = req.body;
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const info = db.prepare('INSERT INTO posts (userId, imageUrl, caption) VALUES (?, ?, ?)').run(currentUserId, imageUrl, caption || '');
      res.json({ id: info.lastInsertRowid, success: true });
    } catch(err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Likes ---
  app.delete('/api/posts/:id', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const post = db.prepare('SELECT userId FROM posts WHERE id = ?').get(req.params.id) as any;
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (post.userId !== currentUserId && currentUserId !== 1) return res.status(403).json({ error: 'Forbidden' }); // Admin (1) can also delete

    db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/posts/:id/like', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      db.prepare('INSERT INTO likes (postId, userId) VALUES (?, ?)').run(req.params.id, currentUserId);
      const postInfo: any = db.prepare('SELECT userId FROM posts WHERE id = ?').get(req.params.id);
      if (postInfo && postInfo.userId !== currentUserId) {
         db.prepare('INSERT INTO notifications (userId, senderId, type, postId) VALUES (?, ?, ?, ?)').run(postInfo.userId, currentUserId, 'like', req.params.id);
      }
      res.json({ success: true, liked: true });
    } catch(err) {
      res.json({ success: true, liked: true }); // already liked
    }
  });

  app.post('/api/posts/:id/unlike', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM likes WHERE postId = ? AND userId = ?').run(req.params.id, currentUserId);
    res.json({ success: true, liked: false });
  });

  // --- Comments ---
  app.post('/api/posts/:id/comments', (req, res) => {
    const currentUserId = (req as any).userId;
    const { content } = req.body;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    if (!content) return res.status(400).json({ error: 'Content required' });

    const info = db.prepare('INSERT INTO comments (postId, userId, content) VALUES (?, ?, ?)').run(req.params.id, currentUserId, content);
    
    const postInfo: any = db.prepare('SELECT userId FROM posts WHERE id = ?').get(req.params.id);
    if (postInfo && postInfo.userId !== currentUserId) {
        db.prepare('INSERT INTO notifications (userId, senderId, type, postId) VALUES (?, ?, ?, ?)').run(postInfo.userId, currentUserId, 'comment', req.params.id);
    }

    const comment = db.prepare(`
        SELECT c.*, u.username, u.avatar 
        FROM comments c
        JOIN users u ON c.userId = u.id
        WHERE c.id = ?
    `).get(info.lastInsertRowid);

    res.json(comment);
  });

  // --- Notifications ---
  app.get('/api/notifications', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = db.prepare(`
      SELECT n.*, u.username as senderName, u.avatar as senderAvatar
      FROM notifications n
      JOIN users u ON n.senderId = u.id
      WHERE n.userId = ?
      ORDER BY n.createdAt DESC
      LIMIT 50
    `).all(currentUserId);
    res.json(notifications);
  });

  app.post('/api/notifications/read', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });
    db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').run(currentUserId);
    res.json({ success: true });
  });

  // --- Stories ---
  app.get('/api/stories', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const stories = db.prepare(`
      SELECT s.*, u.username, u.avatar
      FROM stories s
      JOIN users u ON s.userId = u.id
      LEFT JOIN follows f ON s.userId = f.followingId
      WHERE (f.followerId = ? OR s.userId = ?) AND s.expiresAt > datetime('now')
      ORDER BY s.createdAt ASC
    `).all(currentUserId, currentUserId);

    const grouped = stories.reduce((acc: any, story: any) => {
      if (!acc[story.userId]) {
        acc[story.userId] = {
           userId: story.userId,
           username: story.username,
           avatar: story.avatar,
           items: []
        };
      }
      acc[story.userId].items.push(story);
      return acc;
    }, {});

    res.json(Object.values(grouped));
  });

  app.post('/api/stories', (req, res) => {
    const currentUserId = (req as any).userId;
    const { imageUrl } = req.body;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    db.prepare("INSERT INTO stories (userId, imageUrl, expiresAt) VALUES (?, ?, datetime('now', '+1 day'))").run(currentUserId, imageUrl);
    res.json({ success: true });
  });

  app.delete('/api/stories/:id', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const story = db.prepare('SELECT userId FROM stories WHERE id = ?').get(req.params.id) as any;
    if (!story) return res.status(404).json({ error: 'Not found' });
    if (story.userId !== currentUserId && currentUserId !== 1) return res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM stories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Messages ---
  app.delete('/api/messages/:id', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const msg = db.prepare('SELECT senderId, receiverId FROM messages WHERE id = ?').get(req.params.id) as any;
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (msg.senderId !== currentUserId && currentUserId !== 1) return res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });
  app.get('/api/messages/conversations', (req, res) => {
    const currentUserId = (req as any).userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const conversations = db.prepare(`
      SELECT DISTINCT 
        CASE WHEN senderId = ? THEN receiverId ELSE senderId END as peerId
      FROM messages
      WHERE senderId = ? OR receiverId = ?
    `).all(currentUserId, currentUserId, currentUserId);

    const enriched = conversations.map((c: any) => {
      const user = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(c.peerId);
      const lastMsg = db.prepare(`
        SELECT content, createdAt FROM messages 
        WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
        ORDER BY createdAt DESC LIMIT 1
      `).get(currentUserId, c.peerId, c.peerId, currentUserId);
      return { ...user, lastMsg };
    }).sort((a: any, b: any) => new Date(b.lastMsg.createdAt).getTime() - new Date(a.lastMsg.createdAt).getTime());

    res.json(enriched);
  });

  app.get('/api/messages/:userId', (req, res) => {
    const currentUserId = (req as any).userId;
    const peerId = req.params.userId;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY createdAt ASC
    `).all(currentUserId, peerId, peerId, currentUserId);

    res.json(messages);
  });

  app.post('/api/messages/:userId', (req, res) => {
    const currentUserId = (req as any).userId;
    const peerId = req.params.userId;
    const { content } = req.body;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const info = db.prepare('INSERT INTO messages (senderId, receiverId, content) VALUES (?, ?, ?)').run(currentUserId, peerId, content);
    
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);
    res.json(message);
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OfflineGram server running on http://localhost:${PORT}`);
  });
}

startServer();
