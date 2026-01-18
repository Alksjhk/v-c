import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedFileTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
    ];

    const isImage = allowedImageTypes.includes(file.mimetype);
    const isFile = allowedFileTypes.includes(file.mimetype);

    if (isImage || isFile) {
        cb(null, true);
    } else {
        cb(new Error('不支持的文件类型'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    }
});

export class FileController {
    uploadFile = upload.single('file');

    async handleUpload(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: '没有上传文件'
                });
            }

            const file = req.file;
            
            const isImage = file.mimetype.startsWith('image/');
            const messageType = isImage ? 'image' : 'file';

            const fileUrl = `/uploads/${file.filename}`;

            res.json({
                success: true,
                data: {
                    fileName: file.originalname,
                    fileSize: file.size,
                    fileUrl,
                    messageType,
                    mimeType: file.mimetype
                }
            });
        } catch (error) {
            console.error('文件上传失败:', error);
            res.status(500).json({
                success: false,
                message: '文件上传失败'
            });
        }
    }

    async getFile(req: Request, res: Response) {
        res.status(404).json({
            success: false,
            message: '文件通过静态文件服务访问，请使用 /uploads/ 路径'
        });
    }
}
