const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const { isOriginAllowed } = require('./utils/allowedOriginsCache');

const app = express();

const staticAllowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);

app.use(
  cors({
    // No Origin header at all (server-to-server calls, curl, Postman) is
    // always allowed — cors() passes `undefined` for those, same as the
    // old static-array config effectively did. Same for a totally
    // unconfigured environment (neither CLIENT_URL nor ADMIN_URL set) —
    // preserves the previous fallback-to-open-CORS behavior so a fresh
    // clone with no .env doesn't mysteriously fail every request.
    origin(origin, callback) {
      if (
        !origin ||
        staticAllowedOrigins.length === 0 ||
        staticAllowedOrigins.includes(origin) ||
        isOriginAllowed(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', globalLimiter);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Instant Catalog API is running' });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
