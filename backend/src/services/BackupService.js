import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger.js';
import { compress } from 'zlib';
import EncryptionService from './EncryptionService.js';

const execAsync = promisify(exec);
const compressAsync = promisify(compress);

class BackupService {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || './backups';
        this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
        this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY;
        this.compressionLevel = 9; // Maximum compression
        
        this._initializeBackupDirectory();
    }

    async createBackup(options = {}) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `backup_${timestamp}`);

            // Create backup directory
            await fs.promises.mkdir(backupPath, { recursive: true });

            // Backup database
            await this._backupDatabase(backupPath);

            // Backup files
            await this._backupFiles(backupPath, options.includePaths);

            // Compress backup
            const compressedPath = await this._compressBackup(backupPath);

            // Encrypt backup if encryption key is provided
            const finalPath = this.encryptionKey
                ? await this._encryptBackup(compressedPath)
                : compressedPath;

            // Clean up temporary files
            await this._cleanup(backupPath);
            if (finalPath !== compressedPath) {
                await fs.promises.unlink(compressedPath);
            }

            // Clean up old backups
            await this._cleanupOldBackups();

            return {
                path: finalPath,
                timestamp: new Date(),
                size: (await fs.promises.stat(finalPath)).size
            };
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw error;
        }
    }

    async restoreBackup(backupPath, options = {}) {
        try {
            const tempDir = path.join(this.backupDir, 'temp_restore');
            await fs.promises.mkdir(tempDir, { recursive: true });

            // Decrypt backup if necessary
            const decryptedPath = this.encryptionKey
                ? await this._decryptBackup(backupPath, tempDir)
                : backupPath;

            // Decompress backup
            const extractedPath = await this._decompressBackup(decryptedPath, tempDir);

            // Restore database
            await this._restoreDatabase(extractedPath);

            // Restore files
            await this._restoreFiles(extractedPath, options.restorePaths);

            // Clean up
            await this._cleanup(tempDir);

            return {
                status: 'success',
                timestamp: new Date(),
                details: {
                    restoredFrom: backupPath,
                    restoreLocation: options.restorePaths
                }
            };
        } catch (error) {
            logger.error('Error restoring backup:', error);
            throw error;
        }
    }

    async verifyBackup(backupPath) {
        try {
            // Check if backup file exists
            if (!await this._fileExists(backupPath)) {
                throw new Error('Backup file not found');
            }

            // Verify file integrity
            const integrity = await this._verifyFileIntegrity(backupPath);

            // If encrypted, verify encryption
            if (this.encryptionKey) {
                await this._verifyEncryption(backupPath);
            }

            // Verify content structure
            const structure = await this._verifyBackupStructure(backupPath);

            return {
                status: 'valid',
                timestamp: new Date(),
                details: {
                    integrity,
                    structure
                }
            };
        } catch (error) {
            logger.error('Error verifying backup:', error);
            throw error;
        }
    }

    // Private helper methods
    _initializeBackupDirectory() {
        fs.mkdirSync(this.backupDir, { recursive: true });
    }

    async _backupDatabase(backupPath) {
        const dbConfig = {
            uri: process.env.MONGODB_URI,
            name: process.env.DB_NAME
        };

        const outputPath = path.join(backupPath, 'database');
        await execAsync(
            `mongodump --uri="${dbConfig.uri}" --out="${outputPath}"`
        );
    }

    async _backupFiles(backupPath, includePaths = []) {
        const filesPath = path.join(backupPath, 'files');
        await fs.promises.mkdir(filesPath, { recursive: true });

        for (const sourcePath of includePaths) {
            const targetPath = path.join(
                filesPath,
                path.relative(process.cwd(), sourcePath)
            );
            await this._copyDirectory(sourcePath, targetPath);
        }
    }

    async _compressBackup(backupPath) {
        const compressedPath = `${backupPath}.tar.gz`;
        await execAsync(`tar -czf "${compressedPath}" -C "${backupPath}" .`);
        return compressedPath;
    }

    async _encryptBackup(filePath) {
        const fileContent = await fs.promises.readFile(filePath);
        const encrypted = await EncryptionService.encrypt(
            fileContent,
            this.encryptionKey
        );
        const encryptedPath = `${filePath}.enc`;
        await fs.promises.writeFile(encryptedPath, JSON.stringify(encrypted));
        return encryptedPath;
    }

    async _decryptBackup(filePath, outputDir) {
        const encryptedContent = JSON.parse(
            await fs.promises.readFile(filePath, 'utf8')
        );
        const decrypted = await EncryptionService.decrypt(
            encryptedContent,
            this.encryptionKey
        );
        const decryptedPath = path.join(outputDir, 'decrypted.tar.gz');
        await fs.promises.writeFile(decryptedPath, decrypted);
        return decryptedPath;
    }

    async _decompressBackup(filePath, outputDir) {
        await execAsync(`tar -xzf "${filePath}" -C "${outputDir}"`);
        return outputDir;
    }

    async _restoreDatabase(backupPath) {
        const dbPath = path.join(backupPath, 'database');
        await execAsync(
            `mongorestore --uri="${process.env.MONGODB_URI}" "${dbPath}"`
        );
    }

    async _restoreFiles(backupPath, restorePaths = {}) {
        const filesPath = path.join(backupPath, 'files');
        
        for (const [source, target] of Object.entries(restorePaths)) {
            const sourcePath = path.join(filesPath, source);
            await this._copyDirectory(sourcePath, target);
        }
    }

    async _cleanupOldBackups() {
        const files = await fs.promises.readdir(this.backupDir);
        const now = Date.now();
        const maxAge = this.retentionDays * 24 * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(this.backupDir, file);
            const stats = await fs.promises.stat(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                await fs.promises.unlink(filePath);
            }
        }
    }

    async _cleanup(directory) {
        await fs.promises.rm(directory, { recursive: true, force: true });
    }

    async _copyDirectory(source, target) {
        await fs.promises.mkdir(path.dirname(target), { recursive: true });
        await execAsync(`cp -r "${source}" "${target}"`);
    }

    async _fileExists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async _verifyFileIntegrity(filePath) {
        const stats = await fs.promises.stat(filePath);
        return {
            size: stats.size,
            lastModified: stats.mtime
        };
    }

    async _verifyEncryption(filePath) {
        try {
            const content = JSON.parse(
                await fs.promises.readFile(filePath, 'utf8')
            );
            await EncryptionService.decrypt(content, this.encryptionKey);
            return true;
        } catch {
            throw new Error('Invalid encryption or corrupted backup');
        }
    }

    async _verifyBackupStructure(backupPath) {
        // This would need to be implemented based on your specific backup structure
        return true;
    }
}

export default new BackupService();
