const request = require('request');
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');

// 解析请求体中的 JSON 数据
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let generatedImageUrl = '';
let currentProgress = 0;
let clients = [];

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

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

// 处理客户端发送的 POST 请求
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

// 接收 webhook 请求
app.post('/webhook', (req, res) => {
    console.log('Received webhook:', req.body);
    const data = req.body;

    // 发送进度和日志给客户端
    clients.forEach(c => {
        c.res.write(`data: ${JSON.stringify({ progress: data.progress, log: data })}\n\n`);
    });

    if (data.status === 'SUCCESS' && data.progress === '100%') {
        generatedImageUrl = data.imageDcUrl;
        console.log('Generated image URL:', generatedImageUrl);
    }
    res.status(200).send('Webhook received');
});

app.get('/generated-image', (req, res) => {
    res.json({ imageUrl: generatedImageUrl });
});

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

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});