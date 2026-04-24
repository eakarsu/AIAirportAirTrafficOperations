const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gates', require('./routes/gates'));
app.use('/api/crews', require('./routes/crews'));
app.use('/api/delays', require('./routes/delays'));
app.use('/api/baggage', require('./routes/baggage'));
app.use('/api/runways', require('./routes/runways'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/ai', require('./routes/ai'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✈️  Airport Operations Backend running on port ${PORT}`);
});
