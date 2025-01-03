import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { mlAuth, mlAdminAuth, mlRateLimit } from '../middleware/mlAuth.js';
import Image from '../models/Image.js';
import Analysis from '../models/Analysis.js';
import ImageProcessor from '../services/ImageProcessor.js';
import MLService from '../services/MLService.js';
import logger from '../utils/logger.js';

const router = express.Router();

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

// Enhanced ML authentication endpoint
router.post('/auth/token', 
    auth,
    async (req, res) => {
        try {
            const token = await MLService.generateAuthToken(req.user);
            res.json({ token });
        } catch (error) {
            logger.error('ML auth token generation error:', error);
            res.status(500).json({ error: 'Failed to generate ML auth token' });
        }
    }
);

// Enhanced upload endpoint with better error handling and validation
router.post('/upload', 
    [mlAuth, mlRateLimit],
    upload.single('image'),
    [
        body('metadata').optional().isObject(),
        body('options').optional().isObject(),
        body('priority').optional().isIn(['low', 'medium', 'high'])
    ],
    async (req, res) => {
        try {
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
                options: req.body.options || {},
                preprocessingData: {
                    preprocessingSteps: ImageProcessor.getProcessingSteps(req.file.originalname)
                }
            });

            await image.save();

            // Process image asynchronously
            processImageAsync(image);

            res.status(201).json({
                message: 'Image upload successful',
                imageId: image._id,
                status: 'processing',
                estimatedTime: MLService.estimateProcessingTime(image.size)
            });
        } catch (error) {
            logger.error('Image upload error:', error);
            res.status(500).json({ error: 'Image upload failed' });
        }
    }
);

// Enhanced predict endpoint with caching and batch processing
router.post('/predict/:imageId',
    [mlAuth, mlRateLimit],
    [
        body('options').optional().isObject(),
        body('forceRefresh').optional().isBoolean()
    ],
    async (req, res) => {
        try {
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
    }
);

// Enhanced batch prediction endpoint with progress tracking
router.post('/predict/batch',
    [mlAuth, mlRateLimit],
    [
        body('imageIds').isArray().withMessage('imageIds must be an array'),
        body('options').optional().isObject(),
        body('priority').optional().isIn(['low', 'medium', 'high'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { imageIds, options, priority } = req.body;
            
            // Verify all images belong to user
            const images = await Image.find({
                _id: { $in: imageIds },
                userId: req.mlClient.id
            });

            if (images.length !== imageIds.length) {
                return res.status(400).json({ 
                    error: 'One or more images not found or unauthorized'
                });
            }

            // Check preprocessing status
            const notReady = images.find(img => img.preprocessingStatus !== 'completed');
            if (notReady) {
                return res.status(400).json({
                    error: 'Not all images are ready for prediction',
                    imageId: notReady._id,
                    status: notReady.preprocessingStatus
                });
            }

            // Create batch job
            const batchJob = await MLService.createBatchJob(imageIds, {
                priority,
                options,
                userId: req.mlClient.id
            });

            res.json({
                message: 'Batch prediction started',
                batchId: batchJob._id,
                status: 'processing',
                estimatedTime: MLService.estimateBatchProcessingTime(images.length)
            });
        } catch (error) {
            logger.error('Batch prediction error:', error);
            res.status(500).json({ error: 'Batch prediction failed' });
        }
    }
);

// Enhanced model status endpoint with detailed metrics
router.get('/model/status',
    mlAuth,
    async (req, res) => {
        try {
            const status = await MLService.getModelStatus();
            res.json(status);
        } catch (error) {
            logger.error('Model status error:', error);
            res.status(500).json({ error: 'Failed to get model status' });
        }
    }
);

// Enhanced model validation endpoint
router.post('/model/validate',
    mlAdminAuth,
    [
        body('testSet').optional().isString(),
        body('options').optional().isObject()
    ],
    async (req, res) => {
        try {
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
    }
);

// Get batch job status
router.get('/batch/:batchId',
    mlAuth,
    async (req, res) => {
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
    }
);

// Get processing status with detailed progress
router.get('/status/:imageId',
    mlAuth,
    async (req, res) => {
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
    }
);

async function processImageAsync(image) {
    try {
        // Preprocess image
        await ImageProcessor.process(image);

        // Update status
        image.preprocessingStatus = 'completed';
        await image.save();

        logger.info(`Image ${image._id} processed successfully`);
    } catch (error) {
        logger.error(`Image processing error for ${image._id}:`, error);
        
        // Update status to failed
        image.preprocessingStatus = 'failed';
        image.preprocessingData.error = error.message;
        await image.save();
    }
}

export default router;
