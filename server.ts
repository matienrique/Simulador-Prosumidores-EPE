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
    try {
      const feedback = req.body;
      console.log('Received feedback request:', JSON.stringify(feedback, null, 2));

      const feedbackPath = path.join(process.cwd(), 'feedback.json');
      console.log('Feedback file path:', feedbackPath);
      
      let currentFeedback = [];
      if (fs.existsSync(feedbackPath)) {
        try {
          const data = fs.readFileSync(feedbackPath, 'utf8');
          currentFeedback = JSON.parse(data);
          console.log(`Loaded ${currentFeedback.length} existing feedback entries.`);
        } catch (e) {
          console.error('Error reading/parsing feedback file:', e);
          // If it's corrupted, we'll start fresh or keep empty
        }
      } else {
        console.log('Feedback file does not exist, creating new one.');
      }

      currentFeedback.push(feedback);

      fs.writeFileSync(feedbackPath, JSON.stringify(currentFeedback, null, 2));
      console.log('Feedback saved successfully.');
      res.status(200).json({ message: 'Feedback saved successfully' });
    } catch (e) {
      console.error('CRITICAL: Error in /api/feedback:', e);
      res.status(500).json({ error: 'Failed to save feedback', details: e instanceof Error ? e.message : String(e) });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
