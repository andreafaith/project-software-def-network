import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from './src/utils/logger.js';
import dataRoutes from './src/routes/data.routes.js';
import networkRoutes from './src/routes/network.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/data', dataRoutes);
app.use('/network', networkRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
