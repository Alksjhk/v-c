import { Router } from 'express';
import { FileController } from '../controllers/fileController';

const router = Router();
const fileController = new FileController();

// 上传文件
router.post('/upload', fileController.uploadFile, fileController.handleUpload);

// 获取文件
router.get('/:filename', fileController.getFile);

export default router;