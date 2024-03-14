// server.js
const request = require('request');
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');

// 配置 multer 用于处理文件上传
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 } // 限制文件大小为1MB
});

// 解析请求体中的 JSON 数据
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let generatedImageUrl = ''; // 存储生成的图像 URL
let currentProgress = 0; // 存储当前进度
let clients = []; // 存储已连接的客户端

// 处理 EventSource 连接
app.get('/events', (req, res) => {
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
});

// 重定向到 index.html
app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// 处理文生图请求
app.post('/generate', (req, res) => {
    const { model, prompt, type, token } = req.body;
    // 输出收到的参数,便于调试
    console.log('Received parameters:');
    console.log('Model:', model);
    console.log('Prompt:', prompt);
    console.log('Type:', type);
    console.log('Token:', token);

    // 清空之前的图像 URL 和进度
    generatedImageUrl = '';
    currentProgress = 0;

    // 发送图像生成请求
    sendRequest(model, prompt, type, token, (err, data) => {
        if (err) {
            console.error('Error generating image:', err);
            res.status(500).json({ error: 'Failed to generate image' });
        } else {
            res.json({ taskId: data.taskId });
        }
    });
});

// 处理图生图请求
app.post('/blend', upload.array('images', 5), async (req, res) => {
    const { dimensions, model, type, token } = req.body;
    const images = req.files;

    console.log('Received parameters:');
    console.log('Dimensions:', dimensions);
    console.log('Model:', model);
    console.log('Type:', type);
    console.log('Token:', token);
    console.log('Images:', images);

    if (images.length < 2 || images.length > 5) {
        return res.status(400).json({ error: 'Number of images must be between 2 and 5' });
    }

    const base64Array = images.map(image => `data:image/webp;base64,${image.buffer.toString('base64')}`);

    const formData = new FormData();
    formData.append('dimensions', dimensions);
    formData.append('model', model);
    formData.append('type', type);
    formData.append('token', token);
    base64Array.forEach(base64 => formData.append('base64Array', base64));

    generatedImageUrl = '';
    currentProgress = 0;

    sendBlendRequest(base64Array, dimensions, model, type, token, (err, data) => {
        if (err) {
            console.error('Error generating blended image:', err);
            res.status(500).json({ error: 'Failed to generate blended image' });
        } else {
            res.json({ taskId: data.taskId });
        }
    });
});

// 处理图像到文本请求
app.post('/describe', upload.single('image'), async (req, res) => {
    const { model, type, token } = req.body;
    const image = req.file;

    console.log('Received parameters:');
    console.log('Model:', model);
    console.log('Type:', type);
    console.log('Token:', token);
    console.log('Image:', image);

    const base64 = `data:image/webp;base64,${image.buffer.toString('base64')}`;

    generatedImageUrl = '';
    currentProgress = 0;

    sendDescribeRequest(base64, model, type, token, (err, data) => {
        if (err) {
            console.error('Error generating description:', err);
            res.status(500).json({ error: 'Failed to generate description' });
        } else {
            res.json({ taskId: data.taskId });
        }
    });
});

// 处理action请求
app.post('/action', async (req, res) => {
  const { taskId, customId, token } = req.body;

  try {
    const response = await fetch('https://cfcus02.opapi.win/api/v1/ai/draw/mj/action', {
      method: 'POST',
      headers: {
        'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
        'Authorization': `Bearer ${token}`,
      },
      form: {
        model: 'midjourney',
        taskId,
        customId,
        type: req.body.type || 'FAST',
        webhook: 'https://bit.kurssy.tech/webhook',
        base64Mask: '',
      },
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ success: false, error: 'Action request failed' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Action request failed' });
  }
});

// 接收 webhook 请求
app.post('/webhook', (req, res) => {
  console.log('Received webhook:', req.body);
  const data = req.body;

  if (data.status === 'SUCCESS' && data.progress === '100%') {
    if (data.action === 'IMAGINE') {
      generatedImageUrl = data.imageDcUrl;
      console.log('Generated image URL (Text-to-Image):', generatedImageUrl);
    } else if (data.action === 'BLEND') {
      generatedImageUrl = data.imageDcUrl;
      console.log('Generated image URL (Image-to-Image):', generatedImageUrl);
    } else if (data.action === 'ACTION') {
      generatedImageUrl = data.imageDcUrl;
      console.log('Generated image URL (Action):', generatedImageUrl);
    }

    // 发送进度事件
    sendProgressEvent(100, data.action);
  } else {
    // 发送进度事件
    sendProgressEvent(data.progress, data.action);
  }

  // 发送进度和日志给客户端
  clients.forEach(c => {
    c.res.write(`data: ${JSON.stringify({ progress: data.progress, log: data, action: data.action })}\n\n`);
  });

  res.status(200).send('Webhook received');
});

// 获取生成的图像 URL
app.get('/generated-image', (req, res) => {
    res.json({ imageUrl: generatedImageUrl });
});

// 获取当前进度
app.get('/progress', (req, res) => {
    res.json({ progress: currentProgress });  // 返回当前进度
});

// 发送图像生成请求
function sendRequest(model, prompt, type, token, callback) {
    var options = {
    method: 'POST',
    url: 'https://cfcus02.opapi.win/api/v1/ai/draw/mj/imagine',
    headers: {
       'Authorization': `Bearer ${token}`,
       'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
       'Accept': '*/*',
       'Host': 'cfcus02.opapi.win',
       'Connection': 'keep-alive'
    },
    form: {
       'model': model,
       'prompt': prompt,
       'type': type,
       'webhook': 'https://bit.kurssy.tech/webhook'
    }
};
request(options, function (error, response) {
   if (error) {
       console.error('Error sending request:', error);
       callback(error);
   } else {
       console.log('Image generation request sent');
       const data = JSON.parse(response.body);
       callback(null, data);
   }
});
}

// 发送图生图请求
function sendBlendRequest(base64Array, dimensions, model, type, token, callback) {
   const formData = new FormData();
   formData.append('dimensions', dimensions);
   formData.append('model', model);
   formData.append('type', type);
   formData.append('token', token);
   base64Array.forEach(base64 => formData.append('base64Array', base64));
   formData.append('webhook', 'https://bit.kurssy.tech/webhook'); // 添加 webhook 参数

   var options = {
       method: 'POST',
       url: 'https://api.ohmygpt.com/api/v1/ai/draw/mj/blend',
       headers: {
           'Authorization': `Bearer ${token}`,
           'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
           'Accept': '*/*',
           'Host': 'api.ohmygpt.com',
           'Connection': 'keep-alive'
       },
       formData: {
           dimensions: dimensions,
           model: model,
           type: type,
           token: token,
           base64Array: base64Array,
           webhook: 'https://bit.kurssy.tech/webhook' // 添加 webhook 参数
       }
   };

   request(options, function (error, response) {
       if (error) {
           console.error('Error sending blend request:', error);
           callback(error);
       } else {
           console.log('Blend request sent');
           const data = JSON.parse(response.body);
           callback(null, data);
       }
   });
}

// 发送图像到文本请求
function sendDescribeRequest(base64, model, type, token, callback) {
   var options = {
       method: 'POST',
       url: 'https://cfcus02.opapi.win/api/v1/ai/draw/mj/describe',
       headers: {
           'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
           'Authorization': `Bearer ${token}`
       },
       form: {
           model: model,
           base64: base64,
           type: type,
           webhook: 'https://bit.kurssy.tech/webhook'
       }
   };

   request(options, function (error, response) {
       if (error) {
           console.error('Error sending describe request:', error);
           callback(error);
       } else {
           console.log('Describe request sent');
           const data = JSON.parse(response.body);
           callback(null, data);
       }
   });
}

// 发送进度事件
function sendProgressEvent(progress, action) {
   const progressEvent = {
       progress: progress + '%',
       log: `Progress: ${progress}%`,
       action: action
   };

   clients.forEach(client => {
       client.res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
   });
}

const port = 3000;
app.listen(port, () => {
   console.log(`Server is running on port ${port}`);
});
