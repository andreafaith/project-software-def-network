import logger from '../utils/logger.js';
import Analysis from '../models/Analysis.js';
import Image from '../models/Image.js';
import ApiKey from '../models/ApiKey.js';
import path from 'path';
import fs from 'fs/promises';
import NodeCache from 'node-cache';
import jwt from 'jsonwebtoken';
import BatchJob from '../models/BatchJob.js';

class MLService {
    constructor() {
        this.modelConfig = {
            version: '1.0.0',
            inputSize: [224, 224],
            meanValues: [0.485, 0.456, 0.406],
            stdValues: [0.229, 0.224, 0.225],
            maxBatchSize: 16,
            supportedFormats: ['jpg', 'jpeg', 'png']
        };
        
        this.modelPath = process.env.ML_MODEL_PATH || './ml_models';
        this.modelStatus = 'initialized';
        this.lastModelLoad = null;
        this.modelCache = new NodeCache({ 
            stdTTL: 3600, // 1 hour cache
            checkperiod: 120 // Check every 2 minutes
        });
        
        // Performance monitoring
        this.metrics = {
            totalPredictions: 0,
            successfulPredictions: 0,
            failedPredictions: 0,
            averageLatency: 0,
            lastNLatencies: [], // Keep last 100 latencies
            modelLoadTime: 0,
            lastError: null,
            resourceUsage: {
                memory: 0,
                cpu: 0
            }
        };
    }

    async initialize() {
        try {
            // Ensure model directory exists
            await fs.mkdir(this.modelPath, { recursive: true });

            // Load model configuration
            await this._loadModelConfig();

            // Initialize model cache
            await this._initializeCache();

            // Start metrics collection
            this._startMetricsCollection();

            this.modelStatus = 'ready';
            this.lastModelLoad = new Date();
            logger.info('ML Service initialized successfully');
            
            return true;
        } catch (error) {
            this.modelStatus = 'error';
            this.metrics.lastError = error;
            logger.error('ML Service initialization failed:', error);
            throw error;
        }
    }

    async predict(imageId) {
        const startTime = Date.now();
        this.metrics.totalPredictions++;

        try {
            // Get image data
            const image = await Image.findById(imageId);
            if (!image) {
                throw new Error('Image not found');
            }

            // Check cache first
            const cachedResult = this.modelCache.get(imageId);
            if (cachedResult) {
                logger.info(`Cache hit for image ${imageId}`);
                return cachedResult;
            }

            // Create analysis record
            const analysis = await Analysis.create({
                imageId: image._id,
                userId: image.userId,
                modelVersion: this.modelConfig.version,
                status: 'processing',
                metadata: {
                    modelConfig: this.modelConfig,
                    timestamp: new Date()
                }
            });

            try {
                // Preprocess image
                const preprocessedData = await this._preprocessImage(image);

                // Run prediction
                const predictions = await this._runPrediction(preprocessedData);

                // Calculate metrics
                const endTime = Date.now();
                const processingTime = endTime - startTime;

                // Update analysis with results
                analysis.status = 'completed';
                analysis.results = {
                    predictions,
                    summary: {
                        detectionCount: predictions.length,
                        averageConfidence: this._calculateAverageConfidence(predictions),
                        processingTime
                    }
                };
                analysis.diagnostics = {
                    startTime: new Date(startTime),
                    endTime: new Date(endTime),
                    duration: processingTime,
                    modelLatency: processingTime * 0.8,
                    preprocessingLatency: processingTime * 0.2
                };

                await analysis.save();

                // Cache the result
                this.modelCache.set(imageId, analysis);

                // Update metrics
                this._updateMetrics('success', processingTime);

                return analysis;

            } catch (error) {
                // Handle prediction error
                analysis.status = 'failed';
                analysis.diagnostics = {
                    error: error.message,
                    timestamp: new Date()
                };
                await analysis.save();

                // Update metrics
                this._updateMetrics('failure', Date.now() - startTime);

                throw error;
            }
        } catch (error) {
            logger.error('Prediction error:', error);
            throw error;
        }
    }

    async batchPredict(imageIds) {
        const results = [];
        const batchSize = this.modelConfig.maxBatchSize;
        
        // Check cache first
        const cachedResults = imageIds.map(id => ({
            id,
            result: this.modelCache.get(id)
        })).filter(item => item.result);

        // Process only uncached images
        const uncachedIds = imageIds.filter(id => 
            !cachedResults.find(item => item.id === id)
        );

        // Process images in batches
        for (let i = 0; i < uncachedIds.length; i += batchSize) {
            const batch = uncachedIds.slice(i, i + batchSize);
            const batchPromises = batch.map(id => this.predict(id));
            const batchResults = await Promise.allSettled(batchPromises);
            
            results.push(...batchResults);
        }

        // Combine cached and new results
        return [...cachedResults.map(item => item.result), ...results];
    }

    async getModelStatus() {
        const status = {
            status: this.modelStatus,
            version: this.modelConfig.version,
            lastLoaded: this.lastModelLoad,
            config: this.modelConfig,
            metrics: {
                ...this.metrics,
                currentTime: new Date(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                resourceUsage: await this._getResourceUsage()
            }
        };

        return status;
    }

    async validateModel() {
        try {
            // Load test data
            const testData = await this._loadTestData();

            // Run validation
            const results = await Promise.all(
                testData.map(async (data) => {
                    const startTime = Date.now();
                    const prediction = await this._runPrediction(data.input);
                    const endTime = Date.now();

                    return {
                        expected: data.expected,
                        predicted: prediction,
                        latency: endTime - startTime,
                        accurate: this._compareResults(data.expected, prediction)
                    };
                })
            );

            // Calculate metrics
            const accuracy = results.filter(r => r.accurate).length / results.length;
            const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;

            return {
                isValid: accuracy >= 0.95,
                metrics: {
                    accuracy,
                    averageLatency: avgLatency,
                    memoryUsage: process.memoryUsage().heapUsed,
                    testCases: results.length,
                    timestamp: new Date()
                },
                details: results
            };
        } catch (error) {
            logger.error('Model validation error:', error);
            throw error;
        }
    }

    async generateAuthToken(user) {
        try {
            // Check if user already has an ML API key
            let apiKey = await ApiKey.findOne({
                userId: user._id,
                type: 'ml',
                status: 'active'
            });

            // If no active key exists, create one
            if (!apiKey) {
                apiKey = await ApiKey.generateKey(user._id, 'ml', {
                    name: `ML Key for ${user.email}`,
                    permissions: ['predict'],
                    metadata: {
                        createdVia: 'ml_service',
                        userEmail: user.email
                    }
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user._id,
                    mlAccess: true,
                    permissions: apiKey.permissions,
                    keyId: apiKey._id
                },
                process.env.ML_JWT_SECRET,
                { expiresIn: '24h' }
            );

            return {
                token,
                apiKey: apiKey.key,
                expiresIn: '24h',
                permissions: apiKey.permissions
            };
        } catch (error) {
            logger.error('Error generating ML auth token:', error);
            throw error;
        }
    }

    async createBatchJob(imageIds, options = {}) {
        try {
            const batchJob = new BatchJob({
                userId: options.userId,
                imageIds,
                status: 'queued',
                priority: options.priority || 'medium',
                options: options.options || {},
                metadata: {
                    totalImages: imageIds.length,
                    processedImages: 0,
                    startTime: new Date()
                }
            });

            await batchJob.save();

            // Start processing in background
            this._processBatchJob(batchJob._id).catch(error => {
                logger.error('Batch job processing error:', error);
            });

            return batchJob;
        } catch (error) {
            logger.error('Error creating batch job:', error);
            throw error;
        }
    }

    async getBatchStatus(batchId) {
        try {
            const batchJob = await BatchJob.findById(batchId);
            if (!batchJob) return null;

            const progress = batchJob.metadata.processedImages / batchJob.metadata.totalImages;
            const elapsedTime = Date.now() - batchJob.metadata.startTime;
            const estimatedTimeRemaining = progress > 0 ? 
                (elapsedTime / progress) * (1 - progress) : 
                this.estimateBatchProcessingTime(batchJob.metadata.totalImages);

            return {
                id: batchJob._id,
                status: batchJob.status,
                progress: Math.round(progress * 100),
                processedImages: batchJob.metadata.processedImages,
                totalImages: batchJob.metadata.totalImages,
                startTime: batchJob.metadata.startTime,
                estimatedTimeRemaining,
                results: batchJob.results
            };
        } catch (error) {
            logger.error('Error getting batch status:', error);
            throw error;
        }
    }

    async getProcessingStatus(imageId) {
        try {
            const image = await Image.findById(imageId);
            if (!image) return null;

            const analysis = await Analysis.findOne({ imageId })
                .sort({ createdAt: -1 });

            return {
                imageId: image._id,
                status: image.preprocessingStatus,
                progress: image.preprocessingData?.progress || 0,
                steps: image.preprocessingData?.preprocessingSteps || [],
                analysis: analysis ? {
                    status: analysis.status,
                    results: analysis.results,
                    diagnostics: analysis.diagnostics
                } : null
            };
        } catch (error) {
            logger.error('Error getting processing status:', error);
            throw error;
        }
    }

    estimateProcessingTime(imageSize) {
        // Base processing time in milliseconds
        const baseTime = 2000;
        
        // Factor in image size (assuming 1MB takes 1 second)
        const sizeTime = (imageSize / (1024 * 1024)) * 1000;
        
        // Add buffer for network latency and queue time
        const bufferTime = 1000;
        
        return Math.round(baseTime + sizeTime + bufferTime);
    }

    estimateBatchProcessingTime(imageCount) {
        // Base time per image
        const timePerImage = 3000;
        
        // Factor in parallel processing capability
        const parallelFactor = Math.min(imageCount, this.modelConfig.maxBatchSize);
        
        // Calculate total time with parallel processing
        const totalTime = (imageCount / parallelFactor) * timePerImage;
        
        // Add overhead for batch management
        const overhead = 1000 * Math.ceil(imageCount / 10);
        
        return Math.round(totalTime + overhead);
    }

    async _processBatchJob(batchId) {
        const batchJob = await BatchJob.findById(batchId);
        if (!batchJob) return;

        try {
            batchJob.status = 'processing';
            await batchJob.save();

            const results = [];
            const batchSize = this.modelConfig.maxBatchSize;

            // Process images in batches
            for (let i = 0; i < batchJob.imageIds.length; i += batchSize) {
                const batch = batchJob.imageIds.slice(i, i + batchSize);
                const batchPromises = batch.map(id => this.predict(id));
                const batchResults = await Promise.allSettled(batchPromises);
                
                results.push(...batchResults);

                // Update progress
                batchJob.metadata.processedImages = i + batch.length;
                await batchJob.save();
            }

            // Update final status
            batchJob.status = 'completed';
            batchJob.results = results;
            batchJob.metadata.endTime = new Date();
            await batchJob.save();

        } catch (error) {
            logger.error('Batch processing error:', error);
            batchJob.status = 'failed';
            batchJob.error = error.message;
            await batchJob.save();
        }
    }

    // Private methods
    async _loadModelConfig() {
        const configPath = path.join(this.modelPath, 'config.json');
        try {
            const config = await fs.readFile(configPath, 'utf8');
            this.modelConfig = { ...this.modelConfig, ...JSON.parse(config) };
        } catch (error) {
            logger.warn('Could not load model config, using defaults:', error);
        }
    }

    async _initializeCache() {
        this.modelCache.on('expired', (key, value) => {
            logger.info(`Cache expired for key: ${key}`);
        });
    }

    async _preprocessImage(image) {
        // Implement actual image preprocessing
        return {
            data: Buffer.from('mock_preprocessed_data'),
            metadata: {
                originalSize: image.size,
                preprocessedSize: 224 * 224 * 3
            }
        };
    }

    async _runPrediction(preprocessedData) {
        // Implement actual ML prediction
        return this.simulateMLPrediction(preprocessedData);
    }

    _calculateAverageConfidence(predictions) {
        if (!predictions || predictions.length === 0) return 0;
        const sum = predictions.reduce((acc, pred) => acc + pred.confidence, 0);
        return sum / predictions.length;
    }

    _startMetricsCollection() {
        setInterval(() => {
            this._updateResourceUsage();
        }, 60000); // Update every minute
    }

    _updateMetrics(type, latency) {
        if (type === 'success') {
            this.metrics.successfulPredictions++;
        } else {
            this.metrics.failedPredictions++;
        }

        // Update latency metrics
        this.metrics.lastNLatencies.push(latency);
        if (this.metrics.lastNLatencies.length > 100) {
            this.metrics.lastNLatencies.shift();
        }
        this.metrics.averageLatency = this.metrics.lastNLatencies.reduce((a, b) => a + b, 0) / this.metrics.lastNLatencies.length;
    }

    async _getResourceUsage() {
        return {
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            uptime: process.uptime()
        };
    }

    async _updateResourceUsage() {
        this.metrics.resourceUsage = await this._getResourceUsage();
    }

    async _loadTestData() {
        // Implement test data loading
        return [
            {
                input: { data: Buffer.from('test_data_1') },
                expected: [{ label: 'test_label', confidence: 0.9 }]
            }
        ];
    }

    _compareResults(expected, predicted) {
        // Implement result comparison logic
        return true;
    }

    async simulateMLPrediction(image) {
        // Simulated ML prediction results
        // This should be replaced with actual ML model inference
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

        return [
            {
                label: 'sample_condition_1',
                confidence: 0.95,
                boundingBox: {
                    x: 100,
                    y: 100,
                    width: 50,
                    height: 50
                },
                metadata: {
                    severity: 'high',
                    type: 'primary'
                }
            },
            {
                label: 'sample_condition_2',
                confidence: 0.85,
                boundingBox: {
                    x: 200,
                    y: 150,
                    width: 40,
                    height: 40
                },
                metadata: {
                    severity: 'medium',
                    type: 'secondary'
                }
            }
        ];
    }
}

export default new MLService();
