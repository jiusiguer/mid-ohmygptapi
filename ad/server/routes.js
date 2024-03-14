const express = require('express');
const router = express.Router();
const controllers = require('./controllers');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }
});

router.post('/generate', controllers.generateImage);
router.post('/blend', upload.array('images', 5), controllers.blendImages);
router.post('/describe', upload.single('image'), controllers.describeImage);
router.post('/webhook', controllers.handleWebhook);
router.get('/events', controllers.handleServerSentEvents);
router.get('/generated-image', controllers.getGeneratedImage);
router.get('/progress', controllers.getProgress);

module.exports = router;