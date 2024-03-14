const request = require('request');

function sendGenerateRequest(model, prompt, type, token) {
  return new Promise((resolve, reject) => {
    const options = {
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

    request(options, (error, response) => {
      if (error) {
        console.error('Error sending request:', error);
        reject(error);
      } else {
        console.log('Image generation request sent');
        const data = JSON.parse(response.body);
        resolve(data);
      }
    });
  });
}

function sendBlendRequest(base64Array, dimensions, model, type, token) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('dimensions', dimensions);
    formData.append('model', model);
    formData.append('type', type);
    formData.append('token', token);
    base64Array.forEach(base64 => formData.append('base64Array', base64));
    formData.append('webhook', 'https://bit.kurssy.tech/webhook');

    const options = {
      method: 'POST',
      url: 'https://api.ohmygpt.com/api/v1/ai/draw/mj/blend',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
        'Accept': '*/*',
        'Host': 'api.ohmygpt.com',
        'Connection': 'keep-alive'
      },
      formData: formData
    };

    request(options, (error, response) => {
      if (error) {
        console.error('Error sending blend request:', error);
        reject(error);
      } else {
        console.log('Blend request sent');
        const data = JSON.parse(response.body);
        resolve(data);
      }
    });
  });
}

function sendDescribeRequest(base64, model, type, token) {
  return new Promise((resolve, reject) => {
    const options = {
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

    request(options, (error, response) => {
      if (error) {
        console.error('Error sending describe request:', error);
        reject(error);
      } else {
        console.log('Describe request sent');
        const data = JSON.parse(response.body);
        resolve(data);
      }
    });
  });
}

module.exports = {
  sendGenerateRequest,
  sendBlendRequest,
  sendDescribeRequest
};