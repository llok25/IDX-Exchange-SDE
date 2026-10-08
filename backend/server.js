require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const propertiesRouter = require('./routes/properties');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/properties', propertiesRouter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    // SELECT 1 tests basic network connectivity and query processing
    await db.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check database failure:', error.message);
    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});