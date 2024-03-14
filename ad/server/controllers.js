const services = require('./services');
const utils = require('./utils');

let generatedImageUrl = '';
let currentProgress = 0;
let clients = [];

async function generateImage(req, res) {
  const { model, prompt, type, token } = req.body;
  try {
    const taskId = await services.sendGenerateRequest(model, prompt, type, token);
    res.json({ taskId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate image' });
  }
}

async function blendImages(req, res) {
  const { dimensions, model, type, token } = req.body;
  const images = req.files;

  if (images.length < 2 || images.length > 5) {
    return res.status(400).json({ error: 'Number of images must be between 2 and 5' });
  }

  const base64Array = images.map(image => `data:image/webp;base64,${image.buffer.toString('base64')}`);

  try {
    const taskId = await services.sendBlendRequest(base64Array, dimensions, model, type, token);
    res.json({ taskId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate blended image' });
  }
}

async function describeImage(req, res) {
  const { model, type, token } = req.body;
  const image = req.file;

  const base64 = `data:image/webp;base64,${image.buffer.toString('base64')}`;

  try {
    const taskId = await services.sendDescribeRequest(base64, model, type, token);
    res.json({ taskId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate description' });
  }
}

function handleWebhook(req, res) {
  const data = req.body;
  utils.sendProgressEvent(data, clients);

  if (data.status === 'SUCCESS' && data.progress === '100%') {
    if (data.action === 'IMAGINE') {
      generatedImageUrl = data.imageDcUrl;
      console.log('Generated image URL (Text-to-Image):', generatedImageUrl);
    } else if (data.action === 'BLEND') {
      generatedImageUrl = data.imageDcUrl;
      console.log('Generated image URL (Image-to-Image):', generatedImageUrl);
    }
  }

  res.status(200).send('Webhook received');
}

function handleServerSentEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const clientId = Date.now();
  clients.push({ id: clientId, res });

  req.on('close', () => {
    clients = clients.filter(c => c.id !== clientId);
  });
}

function getGeneratedImage(req, res) {
  res.json({ imageUrl: generatedImageUrl });
}

function getProgress(req, res) {
  res.json({ progress: currentProgress });
}

module.exports = {
  generateImage,
  blendImages,
  describeImage,
  handleWebhook,
  handleServerSentEvents,
  getGeneratedImage,
  getProgress
};