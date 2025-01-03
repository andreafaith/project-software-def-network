import crypto from 'crypto';
import logger from '../utils/logger.js';

class EncryptionService {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 12; // 96 bits for GCM
        this.tagLength = 16; // 128 bits authentication tag
        this.saltLength = 64; // 512 bits
        this.iterations = 100000;
        this.digest = 'sha512';
    }

    async generateKeyPair() {
        try {
            const { publicKey, privateKey } = await crypto.generateKeyPairSync('rsa', {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            return { publicKey, privateKey };
        } catch (error) {
            logger.error('Error generating key pair:', error);
            throw error;
        }
    }

    async encrypt(data, key) {
        try {
            // Generate salt and IV
            const salt = crypto.randomBytes(this.saltLength);
            const iv = crypto.randomBytes(this.ivLength);

            // Derive key using PBKDF2
            const derivedKey = await this._deriveKey(key, salt);

            // Create cipher
            const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

            // Encrypt data
            let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
            encrypted += cipher.final('base64');

            // Get authentication tag
            const authTag = cipher.getAuthTag();

            // Combine all components
            return {
                encrypted,
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64'),
                salt: salt.toString('base64')
            };
        } catch (error) {
            logger.error('Encryption error:', error);
            throw error;
        }
    }

    async decrypt(encryptedData, key) {
        try {
            // Extract components
            const { encrypted, iv, authTag, salt } = encryptedData;

            // Derive key using PBKDF2
            const derivedKey = await this._deriveKey(key, Buffer.from(salt, 'base64'));

            // Create decipher
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                derivedKey,
                Buffer.from(iv, 'base64')
            );

            // Set auth tag
            decipher.setAuthTag(Buffer.from(authTag, 'base64'));

            // Decrypt data
            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return JSON.parse(decrypted);
        } catch (error) {
            logger.error('Decryption error:', error);
            throw error;
        }
    }

    async signRequest(data, privateKey) {
        try {
            const sign = crypto.createSign('SHA512');
            sign.update(JSON.stringify(data));
            return sign.sign(privateKey, 'base64');
        } catch (error) {
            logger.error('Request signing error:', error);
            throw error;
        }
    }

    async verifySignature(data, signature, publicKey) {
        try {
            const verify = crypto.createVerify('SHA512');
            verify.update(JSON.stringify(data));
            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            logger.error('Signature verification error:', error);
            throw error;
        }
    }

    generateApiKey() {
        try {
            return crypto.randomBytes(32).toString('base64');
        } catch (error) {
            logger.error('API key generation error:', error);
            throw error;
        }
    }

    async hashApiKey(apiKey) {
        try {
            const salt = crypto.randomBytes(16);
            const hash = await this._pbkdf2(apiKey, salt, 100000, 64, 'sha512');
            return {
                hash: hash.toString('base64'),
                salt: salt.toString('base64')
            };
        } catch (error) {
            logger.error('API key hashing error:', error);
            throw error;
        }
    }

    async verifyApiKey(apiKey, storedHash, storedSalt) {
        try {
            const hash = await this._pbkdf2(
                apiKey,
                Buffer.from(storedSalt, 'base64'),
                100000,
                64,
                'sha512'
            );
            return crypto.timingSafeEqual(
                Buffer.from(storedHash, 'base64'),
                hash
            );
        } catch (error) {
            logger.error('API key verification error:', error);
            throw error;
        }
    }

    // Private helper methods
    async _deriveKey(key, salt) {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(
                key,
                salt,
                this.iterations,
                this.keyLength,
                this.digest,
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });
    }

    async _pbkdf2(password, salt, iterations, keylen, digest) {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(
                password,
                salt,
                iterations,
                keylen,
                digest,
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });
    }
}

export default new EncryptionService();
