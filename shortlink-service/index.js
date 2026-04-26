require('dotenv').config({ path: '../.env' });
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') console.log('Body:', req.body);
  next();
});

const appUrl = process.env.APP_URL || "http://localhost:3000"

let pool;
async function connectDB() {
  const dbUrl = process.env.DATABASE_URL || "mysql://root:root@db:3306/coding_platform";
  const url = new URL(dbUrl);
  pool = mysql.createPool({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.substring(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

async function isSlugAvailable(slug) {
  const [rows] = await pool.query('SELECT id FROM links WHERE id = ?', [slug]);
  return rows.length === 0;
}

async function generateUniqueSlug() {
  let length = 4;
  let attempts = 0;
  
  while (true) {
    let slug = '';
    for (let i = 0; i < length; i++) {
      slug += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    
    if (await isSlugAvailable(slug)) {
      return slug;
    }
    
    attempts++;
    if (attempts > 100) {
      length++;
      attempts = 0;
    }
  }
}

app.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT long_url FROM links WHERE id = ?', [id]);
    if (rows.length > 0) {
      return res.redirect(rows[0].long_url);
    }
    return res.redirect(appUrl);
  } catch (error) {
    console.error('Error fetching link:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/links', async (req, res) => {
  let { id, long_url } = req.body;
  
  if (!long_url) {
    return res.status(400).json({ error: 'long_url is required' });
  }

  try {
    if (!id) {
      id = await generateUniqueSlug();
    }

    await pool.query('INSERT INTO links (id, long_url) VALUES (?, ?) ON DUPLICATE KEY UPDATE long_url = ?', [id, long_url, long_url]);
    res.json({ id, long_url, short_url: `${process.env.SHORTLINK_URL || 'http://localhost:3001'}/${id}` });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

connectDB().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Shortlink service listening at http://0.0.0.0:${port}`);
  });
});
