import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import bodyParser from 'body-parser';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Feedback API endpoint
  app.post('/api/feedback', (req, res) => {
    const feedback = req.body;
    console.log('Received feedback:', feedback);

    const feedbackPath = path.join(process.cwd(), 'feedback.json');
    
    let currentFeedback = [];
    if (fs.existsSync(feedbackPath)) {
      try {
        const data = fs.readFileSync(feedbackPath, 'utf8');
        currentFeedback = JSON.parse(data);
      } catch (e) {
        console.error('Error reading feedback file:', e);
      }
    }

    currentFeedback.push(feedback);

    try {
      fs.writeFileSync(feedbackPath, JSON.stringify(currentFeedback, null, 2));
      res.status(200).json({ message: 'Feedback saved successfully' });
    } catch (e) {
      console.error('Error saving feedback:', e);
      res.status(500).json({ error: 'Failed to save feedback' });
    }
  });

  // GET feedback data
  app.get('/api/feedback', (req, res) => {
    const feedbackPath = path.join(process.cwd(), 'feedback.json');
    if (fs.existsSync(feedbackPath)) {
      try {
        const data = fs.readFileSync(feedbackPath, 'utf8');
        res.status(200).json(JSON.parse(data));
      } catch (e) {
        console.error('Error reading feedback file:', e);
        res.status(500).json({ error: 'Failed to read feedback' });
      }
    } else {
      res.status(200).json([]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
