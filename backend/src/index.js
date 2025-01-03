import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import routes from './routes/index.js';
import logger from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import WebSocketService from './services/WebSocketService.js';

// ES module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // Add request logging

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "EyeNet API Documentation"
}));

// Routes
app.use('/api', routes);

// Initialize WebSocket
httpServer.on('listening', async () => {
  await WebSocketService.initialize(httpServer);
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// Basic error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
