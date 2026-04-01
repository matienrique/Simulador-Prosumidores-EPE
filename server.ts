import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Feedback API endpoint
  app.post('/api/feedback', (req, res) => {
    try {
      const feedback = req.body;
      if (!feedback || Object.keys(feedback).length === 0) {
        return res.status(400).json({ error: 'Cuerpo de solicitud vacío' });
      }

      const feedbackPath = path.resolve(process.cwd(), 'feedback.json');
      
      let currentFeedback = [];
      if (fs.existsSync(feedbackPath)) {
        const data = fs.readFileSync(feedbackPath, 'utf8');
        currentFeedback = data ? JSON.parse(data) : [];
      }

      currentFeedback.push(feedback);
      fs.writeFileSync(feedbackPath, JSON.stringify(currentFeedback, null, 2));
      
      res.status(200).json({ success: true });
    } catch (e) {
      console.error('Error en /api/feedback:', e);
      res.status(500).json({ error: 'Error interno al guardar feedback' });
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
