import { fileTypeFromBuffer } from 'file-type';
import { extname } from 'path';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const isValidExtension = (filename) => {
  const ext = extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
};

export const fileUploadValidation = async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'No files were uploaded'
      });
    }

    const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: 'Invalid file',
          message: `File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }

      // Check file extension
      if (!isValidExtension(file.name)) {
        return res.status(400).json({
          error: 'Invalid file',
          message: `File ${file.name} has an invalid extension`
        });
      }

      // Check file type using content detection
      const buffer = file.data;
      const fileType = await fileTypeFromBuffer(buffer);
      
      if (!fileType || !ALLOWED_FILE_TYPES.includes(fileType.mime)) {
        return res.status(400).json({
          error: 'Invalid file',
          message: `File type ${fileType ? fileType.mime : 'unknown'} is not allowed`
        });
      }

      // Check for malicious content
      const fileContent = file.data.toString().toLowerCase();
      if (fileContent.includes('<?php') || 
          fileContent.includes('<%') || 
          fileContent.includes('<script') ||
          fileContent.includes('javascript:')) {
        return res.status(400).json({
          error: 'Security error',
          message: `File ${file.name} contains potentially malicious content`
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: 'Error validating file upload'
    });
  }
};
