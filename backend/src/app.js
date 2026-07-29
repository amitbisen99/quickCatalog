const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();

const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', globalLimiter);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'QuickCatalog API is running' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
