import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path from backend directory
    let uploadPath = path.join(__dirname, '../../uploads/');
    
    if (file.fieldname === 'planFile') {
      uploadPath = path.join(uploadPath, 'plans/');
    } else if (file.fieldname === 'cbsFile') {
      uploadPath = path.join(uploadPath, 'cbs/');
    } else if (file.fieldname === 'evidence') {
      uploadPath = path.join(uploadPath, 'evidence/');
    } else if (file.fieldname === 'file') {
      uploadPath = path.join(uploadPath, 'june-balance/');
    } else if (file.fieldname === 'mappingFile') {
      uploadPath = path.join(uploadPath, 'mappings/');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    'planFile': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'],
    'cbsFile': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    'evidence': ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    'file': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'],
    'mappingFile': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'],
  };

  if (allowedMimes[file.fieldname]?.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter,
});

