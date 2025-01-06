import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth.js';
import mlMiddleware from '../middleware/mlAuth.js';
import Image from '../models/Image.js';
import Analysis from '../models/Analysis.js';
import ImageProcessor from '../services/ImageProcessor.js';
import MLService from '../services/MLService.js';
import logger from '../utils/logger.js';

const router = express.Router();
const { mlAuth, mlAdminAuth, mlRateLimit } = mlMiddleware;

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        cb(null, `${uniqueId}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (!ImageProcessor.validateFormat(file.mimetype)) {
            return cb(new Error('Invalid file format'));
        }
        cb(null, true);
    }
});

// Initialize MLService in an async IIFE
(async () => {
    try {
        await MLService.initialize();
    } catch (error) {
        logger.error('Failed to initialize MLService:', error);
    }
})();

// Enhanced ML authentication endpoint
router.post('/auth/token', auth.verifyToken, async (req, res) => {
    try {
        const token = await MLService.generateAuthToken(req.user);
        res.json({ token });
    } catch (error) {
        logger.error('ML auth token generation error:', error);
        res.status(500).json({ error: 'Failed to generate ML auth token' });
    }
});

// Enhanced upload endpoint with better error handling and validation
router.post('/upload', mlAuth, mlRateLimit, upload.single('image'), async (req, res) => {
    try {
        // Validate request body
        await Promise.all([
            body('metadata').optional().isObject().run(req),
            body('options').optional().isObject().run(req),
            body('priority').optional().isIn(['low', 'medium', 'high']).run(req)
        ]);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        // Enhanced image validation
        if (!MLService.modelConfig.supportedFormats.includes(
            path.extname(req.file.originalname).slice(1).toLowerCase()
        )) {
            return res.status(400).json({ 
                error: 'Unsupported image format',
                supportedFormats: MLService.modelConfig.supportedFormats
            });
        }

        const image = new Image({
            userId: req.mlClient.id,
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            preprocessingStatus: 'processing',
            priority: req.body.priority || 'medium',
            metadata: req.body.metadata || {},
            options: req.body.options || {} ,
            preprocessingData: {
                preprocessingSteps: ImageProcessor.getProcessingSteps(req.file.originalname)
            }
        });

        await image.save();

        // Process image asynchronously
        const result = await processImageAsync(image);
        image.preprocessingStatus = result.status;
        await image.save();

        res.status(201).json({
            message: 'Image upload successful',
            imageId: image._id,
            status: result.status,
            estimatedTime: MLService.estimateProcessingTime(image.size)
        });
    } catch (error) {
        logger.error('Image upload error:', error);
        res.status(500).json({ error: 'Image upload failed' });
    }
});

// Process single image
router.post('/predict/single', mlAuth, mlRateLimit, upload.single('image'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const result = await processImageAsync(req.file);
        res.json(result);
    } catch (error) {
        logger.error('Image prediction error:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

// Process batch of images
router.post('/predict/batch', mlAuth, mlRateLimit, async (req, res) => {
    try {
        // Validate request body
        await Promise.all([
            body('imageIds').isArray().withMessage('imageIds must be an array').run(req),
            body('options').optional().isObject().run(req)
        ]);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { imageIds, options } = req.body;
        const results = await Promise.all(
            imageIds.map(id => MLService.processBatchItem(id, options))
        );

        res.json({ results });
    } catch (error) {
        logger.error('Batch prediction error:', error);
        res.status(500).json({ error: 'Failed to process batch' });
    }
});

// Get model status
router.get('/model/status', mlAuth, async (req, res) => {
    try {
        const status = await MLService.getModelStatus();
        res.json(status);
    } catch (error) {
        logger.error('Model status error:', error);
        res.status(500).json({ error: 'Failed to get model status' });
    }
});

// Update model (admin only)
router.post('/model/update', mlAuth, mlAdminAuth, upload.single('model'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No model file provided' });
        }

        const result = await MLService.updateModel(req.file.path);
        res.json(result);
    } catch (error) {
        logger.error('Model update error:', error);
        res.status(500).json({ error: 'Failed to update model' });
    }
});

// Enhanced model validation endpoint
router.post('/model/validate', mlAuth, mlAdminAuth, async (req, res) => {
    try {
        // Validate request body
        await Promise.all([
            body('testSet').optional().isString().run(req),
            body('options').optional().isObject().run(req)
        ]);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const validation = await MLService.validateModel(req.body.testSet, req.body.options);
        res.json(validation);
    } catch (error) {
        logger.error('Model validation error:', error);
        res.status(500).json({ error: 'Model validation failed' });
    }
});

// Get batch job status
router.get('/batch/:batchId', mlAuth, async (req, res) => {
    try {
        const status = await MLService.getBatchStatus(req.params.batchId);
        if (!status) {
            return res.status(404).json({ error: 'Batch job not found' });
        }
        res.json(status);
    } catch (error) {
        logger.error('Batch status error:', error);
        res.status(500).json({ error: 'Failed to get batch status' });
    }
});

// Get processing status with detailed progress
router.get('/status/:imageId', mlAuth, async (req, res) => {
    try {
        const image = await Image.findOne({
            _id: req.params.imageId,
            userId: req.mlClient.id
        });

        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const status = await MLService.getProcessingStatus(image._id);
        res.json(status);
    } catch (error) {
        logger.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to get processing status' });
    }
});

// Enhanced predict endpoint with caching and batch processing
router.post('/predict/:imageId', mlAuth, mlRateLimit, async (req, res) => {
    try {
        // Validate request body
        await Promise.all([
            body('options').optional().isObject().run(req),
            body('forceRefresh').optional().isBoolean().run(req)
        ]);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const image = await Image.findOne({
            _id: req.params.imageId,
            userId: req.mlClient.id
        });

        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        if (image.preprocessingStatus !== 'completed') {
            return res.status(400).json({ 
                error: 'Image preprocessing not completed',
                status: image.preprocessingStatus,
                progress: image.preprocessingData?.progress || 0
            });
        }

        const analysis = await MLService.predict(image._id);
        res.json(analysis);
    } catch (error) {
        logger.error('Prediction error:', error);
        res.status(500).json({ error: 'Prediction failed' });
    }
});

async function processImageAsync(file) {
    try {
        // Process the image using MLService
        const result = await MLService.processImage(file.path);
        
        // Save the analysis results
        const analysis = new Analysis({
            imageId: file.filename,
            results: result,
            timestamp: new Date()
        });
        await analysis.save();

        return {
            id: file.filename,
            results: result,
            preprocessed: true,
            status: 'completed'
        };
    } catch (error) {
        logger.error('Image processing error:', error);
        throw error;
    }
}

export default router;