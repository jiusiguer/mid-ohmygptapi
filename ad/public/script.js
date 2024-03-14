// script.js
const textToImageForm = document.getElementById('text-to-image-form');
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

imageToTextBtn.addEventListener('click', () => {
  textToImageForm.classList.add('hidden');
  imageToImageForm.classList.add('hidden');
  imageToTextForm.classList.remove('hidden');
  resetUI();
});

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

textToImageBtn.addEventListener('click', () => {
  textToImageForm.classList.remove('hidden');
  imageToImageForm.classList.add('hidden');
  imageToTextForm.classList.add('hidden');
  resetUI();
});

imageToImageBtn.addEventListener('click', () => {
  textToImageForm.classList.add('hidden');
  imageToImageForm.classList.remove('hidden');
  imageToTextForm.classList.add('hidden');
  resetUI();
});

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

const eventSource = new EventSource('/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateProgressBar(data.progress);
  updateLog(data.log);

  if (data.log.status === 'SUCCESS' && data.log.progress === '100%') {
    displayImage(data.log.imageDcUrl, data.log.imageS3Url);
  }
};

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
    displayPrompt(log.prompt);
    displayImage(log.imageDcUrl, log.imageS3Url);
    stopLoading();
  }
}

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
  document.getElementById('image-container').appendChild(imageContainer);
}

function resetUI() {
  progressBar.style.width = '0';
  logContainer.innerHTML = '';
  imageContainer.innerHTML = '';
  progressContainer.classList.add('hidden');
  logContainer.classList.add('hidden');
}

function displayPrompt(prompt) {
  const promptElement = document.createElement('div');
  promptElement.textContent = prompt;
  imageContainer.appendChild(promptElement);
}

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

function validateToken(token) {
  const tokenPattern = /^sk-[a-zA-Z0-9]+$/;
  return tokenPattern.test(token);
}

function showLoadingState() {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.classList.add('loading-indicator');
  loadingIndicator.textContent = 'Loading...';
  document.body.appendChild(loadingIndicator);
}

function hideLoadingState() {
  const loadingIndicator = document.querySelector('.loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}