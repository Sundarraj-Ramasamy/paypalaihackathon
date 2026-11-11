import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createInvoiceFromText } from './services/invoiceService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Smart Invoice Generator backend is running.' });
});

app.post('/api/generate-invoice', async (req, res) => {
  const { text } = req.body || {};

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Invoice description is required.' });
  }

  try {
    const result = await createInvoiceFromText(text);
    return res.json(result);
  } catch (error) {
    console.error('Failed to generate invoice:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate invoice.',
    });
  }
});

app.listen(port, () => {
  console.log(`Smart Invoice Generator backend listening on http://localhost:${port}`);
});
