import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ImageProcessor {
    constructor() {
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];
        this.maxDimension = 1024; // Maximum dimension for normalized images
        this.thumbnailSize = 200; // Thumbnail size
    }

    async processImage(imagePath, originalName) {
        try {
            const metadata = await this.getMetadata(imagePath);
            const normalizedPath = await this.normalizeImage(imagePath, metadata);
            const thumbnailPath = await this.createThumbnail(imagePath);
            const features = await this.extractFeatures(imagePath, metadata);

            return {
                metadata,
                normalizedPath,
                thumbnailPath,
                features
            };
        } catch (error) {
            logger.error('Image processing error:', error);
            throw error;
        }
    }

    async getMetadata(imagePath) {
        try {
            const metadata = await sharp(imagePath).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                space: metadata.space,
                channels: metadata.channels,
                depth: metadata.depth,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation
            };
        } catch (error) {
            logger.error('Metadata extraction error:', error);
            throw error;
        }
    }

    async normalizeImage(imagePath, metadata) {
        try {
            const { width, height } = metadata;
            const normalizedPath = imagePath.replace(/\.[^/.]+$/, '') + '_normalized.jpg';

            // Calculate new dimensions maintaining aspect ratio
            let newWidth = width;
            let newHeight = height;
            if (width > this.maxDimension || height > this.maxDimension) {
                if (width > height) {
                    newWidth = this.maxDimension;
                    newHeight = Math.round(height * (this.maxDimension / width));
                } else {
                    newHeight = this.maxDimension;
                    newWidth = Math.round(width * (this.maxDimension / height));
                }
            }

            await sharp(imagePath)
                .resize(newWidth, newHeight)
                .jpeg({ quality: 90 })
                .toFile(normalizedPath);

            return normalizedPath;
        } catch (error) {
            logger.error('Image normalization error:', error);
            throw error;
        }
    }

    async createThumbnail(imagePath) {
        try {
            const thumbnailPath = imagePath.replace(/\.[^/.]+$/, '') + '_thumb.jpg';

            await sharp(imagePath)
                .resize(this.thumbnailSize, this.thumbnailSize, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

            return thumbnailPath;
        } catch (error) {
            logger.error('Thumbnail creation error:', error);
            throw error;
        }
    }

    async extractFeatures(imagePath, metadata) {
        try {
            // Basic feature extraction
            const stats = await sharp(imagePath).stats();

            return {
                channels: stats.channels.map(channel => ({
                    mean: channel.mean,
                    std: channel.std,
                    min: channel.min,
                    max: channel.max
                })),
                entropy: stats.entropy,
                aspectRatio: metadata.width / metadata.height,
                isLandscape: metadata.width > metadata.height,
                megaPixels: (metadata.width * metadata.height) / 1000000
            };
        } catch (error) {
            logger.error('Feature extraction error:', error);
            throw error;
        }
    }

    validateFormat(mimetype) {
        const format = mimetype.split('/')[1].toLowerCase();
        return this.supportedFormats.includes(format);
    }

    getProcessingSteps(originalName) {
        return [
            {
                step: 'validation',
                status: 'pending',
                details: { filename: originalName }
            },
            {
                step: 'metadata',
                status: 'pending'
            },
            {
                step: 'normalization',
                status: 'pending'
            },
            {
                step: 'thumbnail',
                status: 'pending'
            },
            {
                step: 'feature_extraction',
                status: 'pending'
            }
        ];
    }
}

export default new ImageProcessor();
