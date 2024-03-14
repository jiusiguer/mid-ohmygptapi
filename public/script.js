// 获取相关元素
const textToImageForm = document.getElementById('text-to-image-form');
const actionContainer = document.getElementById('action-container');
const actionOptionsContainer = document.getElementById('action-options');
const actionPositionsContainer = document.getElementById('action-positions');
const actionSubmitButton = document.getElementById('action-submit');
const actionProgressContainer = document.getElementById('action-progress-container');
const actionProgressBar = document.getElementById('action-progress-bar');
const actionLogContainer = document.getElementById('action-log-container');
const imageToImageForm = document.getElementById('image-to-image-form');
const textToImageBtn = document.getElementById('text-to-image-btn');
const imageToImageBtn = document.getElementById('image-to-image-btn');
const imagesInput = document.getElementById('images');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imageUploadMessage = document.getElementById('image-upload-message');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.querySelector('.progress-bar');
const logContainer = document.querySelector('.log-container');
const notification = document.querySelector('.notification');
const imageContainer = document.getElementById('image-container');
const imageToTextForm = document.getElementById('image-to-text-form');
const imageToTextImage = document.getElementById('image-to-text-image');
const imageToTextBtn = document.getElementById('image-to-text-btn');

let uploadedImages = [];
let webhookData = null;

// 初始状态下隐藏action相关元素
actionContainer.classList.add('hidden');

// 监听文件输入框的 change 事件
imagesInput.addEventListener('change', () => {
  const files = Array.from(imagesInput.files);

  files.forEach((file) => {
    if (uploadedImages.length < 5 && file.type.startsWith('image/')) {
      uploadedImages.push(file);
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `Image ${uploadedImages.length}`;

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        const index = uploadedImages.indexOf(file);
        if (index > -1) {
          uploadedImages.splice(index, 1);
          imagePreviewContainer.removeChild(img);
          imagePreviewContainer.removeChild(deleteButton);
          updateImageUploadMessage();
        }
      });

      imagePreviewContainer.appendChild(img);
      imagePreviewContainer.appendChild(deleteButton);
    }
  });

  updateImageUploadMessage();
});

// 监听图像到文本表单的 submit 事件
imageToTextForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const model = document.getElementById('image-to-text-model').value;
  const type = document.getElementById('image-to-text-type').value;
  const token = document.getElementById('image-to-text-token').value;
  const image = imageToTextImage.files[0];

  if (!image || image.size > 1024 * 1024) {
    showNotification('Please upload an image file not exceeding 1MB.');
    return;
  }

  if (!validateToken(token)) {
    showNotification('Please enter a valid token');
    return;
  }

  const formData = new FormData();
  formData.append('model', model);
  formData.append('type', type);
  formData.append('token', token);
  formData.append('image', image);

  try {
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showLoadingState();

    const response = await fetch('/describe', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      showNotification('Text generation started');
      progressContainer.classList.remove('hidden');
      logContainer.classList.remove('hidden');
      document.getElementById('image-to-text-result').classList.remove('hidden');
      startLoading();
    } else {
      showNotification('API request failed');
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification('API request failed');
  } finally {
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    hideLoadingState();
  }
});

// 图生文功能点击隐藏其他的表单
imageToTextBtn.addEventListener('click', () => {
  textToImageForm.classList.add('hidden');
  imageToImageForm.classList.add('hidden');
  imageToTextForm.classList.remove('hidden');
  resetUI();
});

// 图生图功能的图片上传提示
function updateImageUploadMessage() {
  const fileCount = uploadedImages.length;

  if (fileCount === 0) {
    imageUploadMessage.textContent = 'No images uploaded.';
    imageUploadMessage.style.color = 'black';
  } else if (fileCount === 1) {
    imageUploadMessage.textContent = 'Please upload at least 2 images.';
    imageUploadMessage.style.color = 'red';
  } else if (fileCount >= 5) {
    imageUploadMessage.textContent = 'You have reached the maximum limit of 5 images.';
    imageUploadMessage.style.color = 'red';
  } else {
    imageUploadMessage.textContent = `You have uploaded ${fileCount} images.`;
    imageUploadMessage.style.color = 'green';
  }
}

// 文本到图像功能点击隐藏其他的表单
textToImageBtn.addEventListener('click', () => {
  textToImageForm.classList.remove('hidden');
  imageToImageForm.classList.add('hidden');
  imageToTextForm.classList.add('hidden');
  resetUI();
});

// 图像到图像功能点击隐藏其他的表单
imageToImageBtn.addEventListener('click', () => {
  textToImageForm.classList.add('hidden');
  imageToImageForm.classList.remove('hidden');
  imageToTextForm.classList.add('hidden');
  resetUI();
});

// 监听文本到图像表单的 submit 事件
textToImageForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const model = document.getElementById('model').value;
  const prompt = document.getElementById('prompt').value.trim();
  const type = document.getElementById('type').value;
  const token = document.getElementById('token').value.trim();

  if (prompt === '') {
    showNotification('Please enter a prompt');
    return;
  }

  if (!validateToken(token)) {
    showNotification('Please enter a valid token');
    return;
  }

  try {
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showLoadingState();

    const response = await fetch('/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, prompt, type, token })
    });

    if (response.ok) {
      showNotification('Image generation started');
      progressContainer.classList.remove('hidden');
      logContainer.classList.remove('hidden');
    } else {
      const errorData = await response.json();
      showNotification(`API request failed: ${errorData.error}`);
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification('API request failed');
  }
});

// 监听图像到图像表单的 submit 事件
imageToImageForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const model = document.getElementById('blend-model').value;
  const type = document.getElementById('blend-type').value;
  const token = document.getElementById('blend-token').value;
  const dimensions = document.getElementById('dimensions').value;

  if (uploadedImages.length < 2|| uploadedImages.length > 5) {
    showNotification('Please upload between 2 and 5 images.');
    return;
  }

  if (!validateToken(token)) {
    showNotification('Please enter a valid token');
    return;
  }

  const formData = new FormData();
  formData.append('dimensions', dimensions);
  formData.append('model', model);
  formData.append('type', type);
  formData.append('token', token);
  uploadedImages.forEach(image => formData.append('images', image));

  try {
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showLoadingState();

    const response = await fetch('/blend', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      showNotification('Image generation started');
      progressContainer.classList.remove('hidden');
      logContainer.classList.remove('hidden');
      uploadedImages = [];
      imagePreviewContainer.innerHTML = '';
      updateImageUploadMessage();
    } else {
      showNotification('API request failed');
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification('API request failed');
  } finally {
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = false;
    hideLoadingState();
  }
});

// 创建 EventSource 对象,用于接收服务器端发送的事件
const eventSource = new EventSource('/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateProgressBar(data.progress);
  updateLog(data.log);

  if (data.log.status === 'SUCCESS' && data.log.progress === '100%') {
    if (data.log.action === 'IMAGINE') {
      displayImage(data.log.imageDcUrl, data.log.imageS3Url);
      // 文生图操作完成后,显示action容器,并存储webhook数据
      onTextToImageComplete(data.log);
    } else if (data.log.action === 'ACTION') {
      displayActionImage(data.log.imageDcUrl, data.log.imageS3Url);
    }
  }
};

// 当文生图操作完成后,显示action容器,并存储webhook数据
function onTextToImageComplete(data) {
  actionContainer.classList.remove('hidden');
  webhookData = data;
}

// 显示action生成的图像
function displayActionImage(imageUrl, imageS3Url) {
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Generated Action Image';
  img.onerror = function() {
    this.src = 'placeholder.jpg';
    this.alt = 'Image not available';
  };

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy Image Link';
  copyButton.classList.add('copy-link-btn');
  copyButton.addEventListener('click', () => {
    const imageLink = `https://pi.ohmygpt.com/api/v1/content/mj-generated/${imageS3Url}`;
    navigator.clipboard.writeText(imageLink)
      .then(() => {
        showNotification('Image link copied to clipboard');
      })
      .catch((error) => {
        console.error('Failed to copy image link:', error);
      });
  });

  const imageContainer = document.createElement('div');
  imageContainer.classList.add('image-container');

  imageContainer.appendChild(img);
  imageContainer.appendChild(copyButton);
  document.getElementById('action-image-container').innerHTML = ''; // 清空之前的action图片预览框
  document.getElementById('action-image-container').appendChild(imageContainer);
}

// 当用户选择action类型时,显示相应的位置选项
actionOptionsContainer.addEventListener('change', (event) => {
  const selectedOption = event.target.value;
  if (selectedOption === 'upsample' || selectedOption === 'variation') {
    actionPositionsContainer.classList.remove('hidden');
  } else {
    actionPositionsContainer.classList.add('hidden');
  }
});

// 根据选择的action类型和位置获取customId
function getCustomId(selectedOption, selectedPosition) {
  if (!webhookData || !webhookData.actions) {
    return null;
  }

  const actionType = selectedOption.charAt(0).toUpperCase();
  const actionPosition = selectedPosition;

  const action = webhookData.actions.find(
    (action) => action.label === `${actionType}${actionPosition}`
  );

  return action ? action.customId : null;
}

// 当用户提交action请求时,发送请求到后端
actionSubmitButton.addEventListener('click', () => {
  const taskId = webhookData ? webhookData.taskId : null;
  const selectedOption = document.querySelector('input[name="action-type"]:checked').value;
  const selectedPosition = document.querySelector('input[name="action-position"]:checked')?.value;

  const customId = getCustomId(selectedOption, selectedPosition);
  const token = document.getElementById('token').value;

  if (!taskId || !customId) {
    console.error('Invalid taskId or customId');
    return;
  }

  fetch('/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      customId,
      token,
    }),
  })
    .then((response) => {
      if (response.ok) {
        actionProgressContainer.classList.remove('hidden');
        actionLogContainer.classList.remove('hidden');
      } else {
        console.error('Action request failed');
      }
    })
    .catch((error) => {
      console.error('Error:', error);
    });
});

// 更新进度条
function updateProgressBar(progress) {
  progressBar.style.width = progress;

  const previousProgressText = progressBar.querySelector('span');
  if (previousProgressText) {
    progressBar.removeChild(previousProgressText);
  }

  const progressText = document.createElement('span');
  progressText.textContent = progress;
  progressText.style.position = 'absolute';
  progressText.style.left = '50%';
  progressText.style.transform = 'translateX(-50%)';
  progressText.style.color = '#fff';
  progressText.style.fontSize = '14px';
  progressText.style.fontWeight = '500';
  progressText.style.maxWidth = '90%';
  progressText.style.overflow = 'hidden';
  progressText.style.textOverflow = 'ellipsis';
  progressText.style.whiteSpace = 'nowrap';
  progressBar.appendChild(progressText);
}

// 更新日志
function updateLog(log) {
  const logElement = document.createElement('pre');

  let actionText = '';
  if (log.action === 'IMAGINE') {
    actionText = 'Text-to-Image';
  } else if (log.action === 'BLEND') {
    actionText = 'Image-to-Image';
  } else if (log.action === 'DESCRIBE') {
    actionText = 'Image-to-Text';
  }

  logElement.textContent = `[${actionText}] ${JSON.stringify(log, null, 2)}`;
  logContainer.appendChild(logElement);
  logContainer.scrollTop = logContainer.scrollHeight;

  if (log.status === 'SUCCESS' && log.progress === '100%') {
    if (log.action === 'DESCRIBE') {
      displayImageToTextResult(log.prompt);
    } else if (log.action === 'IMAGINE') {
      displayImage(log.imageDcUrl, log.imageS3Url);
      onTextToImageComplete(log);
    } else if (log.action === 'ACTION') {
      displayActionImage(log.imageDcUrl, log.imageS3Url);
    }
  }
}

// 显示生成的图像
function displayImage(imageUrl, imageS3Url) {
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Generated Image';
  img.onerror = function() {
    this.src = 'placeholder.jpg';
    this.alt = 'Image not available';
  };

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy Image Link';
  copyButton.classList.add('copy-link-btn');
  copyButton.addEventListener('click', () => {
    const imageLink = `https://pi.ohmygpt.com/api/v1/content/mj-generated/${imageS3Url}`;
    navigator.clipboard.writeText(imageLink)
      .then(() => {
        showNotification('Image link copied to clipboard');
      })
      .catch((error) => {
        console.error('Failed to copy image link:', error);
      });
  });

  const imageContainer = document.createElement('div');
  imageContainer.classList.add('image-container');

  imageContainer.appendChild(img);
  imageContainer.appendChild(copyButton);
  document.getElementById('image-container').innerHTML = ''; // 清空之前的图片预览框
  document.getElementById('image-container').appendChild(imageContainer);
}

// 显示图像到文本的结果
function displayImageToTextResult(prompt) {
  const resultContainer = document.getElementById('image-to-text-result');
  const promptContainer = document.getElementById('image-to-text-prompt');
  
  promptContainer.textContent = prompt;
  resultContainer.classList.remove('hidden');
}

// 重置 UI
function resetUI() {
 progressBar.style.width = '0';
 logContainer.innerHTML = '';
 imageContainer.innerHTML = '';
 document.getElementById('image-to-text-prompt').textContent = '';
 document.getElementById('image-to-text-result').classList.add('hidden');
 progressContainer.classList.add('hidden');
 logContainer.classList.add('hidden');
}

// 显示提示
function displayPrompt(prompt) {
 const promptElement = document.createElement('div');
 promptElement.textContent = prompt;
 imageContainer.appendChild(promptElement);
}

// 显示通知
function showNotification(message) {
 notification.textContent = message;
 notification.classList.add('show');
 setTimeout(() => {
   notification.classList.remove('show');
 }, 2000);
}

// 验证令牌是否有效
function validateToken(token) {
 const tokenPattern = /^sk-[a-zA-Z0-9]+$/;
 return tokenPattern.test(token);
}

// 显示加载状态
function showLoadingState() {
 const loadingIndicator = document.createElement('div');
 loadingIndicator.classList.add('loading-indicator');
 loadingIndicator.textContent = 'Loading...';
 document.body.appendChild(loadingIndicator);
}

// 隐藏加载状态
function hideLoadingState() {
 const loadingIndicator = document.querySelector('.loading-indicator');
 if (loadingIndicator) {
   loadingIndicator.remove();
 }
}
