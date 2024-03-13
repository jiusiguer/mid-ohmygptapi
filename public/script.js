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
    resetUI();
});

imageToImageBtn.addEventListener('click', () => {
    textToImageForm.classList.add('hidden');
    imageToImageForm.classList.remove('hidden');
    resetUI();
});

textToImageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const model = document.getElementById('model').value;
    const prompt = document.getElementById('prompt').value;
    const type = document.getElementById('type').value;
    const token = document.getElementById('token').value;

    try {
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
    }
});

imageToImageForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const model = document.getElementById('blend-model').value;
    const type = document.getElementById('blend-type').value;
    const token = document.getElementById('blend-token').value;
    const dimensions = document.getElementById('dimensions').value;

    if (uploadedImages.length < 2 || uploadedImages.length > 5) {
        alert('Please upload between 2 and 5 images.');
        return;
    }

    const formData = new FormData();
    formData.append('dimensions', dimensions);
    formData.append('model', model);
    formData.append('type', type);
    formData.append('token', token);
    uploadedImages.forEach(image => formData.append('images', image));

    try {
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

    // 移除之前的进度文本
    const previousProgressText = progressBar.querySelector('span');
    if (previousProgressText) {
        progressBar.removeChild(previousProgressText);
    }

    // 创建新的进度文本
    const progressText = document.createElement('span');
    progressText.textContent = progress;
    progressText.style.position = 'absolute';
    progressText.style.right = '10px';
    progressText.style.top = '50%';
    progressText.style.transform = 'translateY(-50%)';
    progressText.style.color = 'black';
    progressText.style.zIndex = '1';
    progressBar.appendChild(progressText);
}

function updateLog(log) {
    const logElement = document.createElement('pre');

    let actionText = '';
    if (log.action === 'IMAGINE') {
        actionText = 'Text-to-Image';
    } else if (log.action === 'BLEND') {
        actionText = 'Image-to-Image';
    }

    logElement.textContent = `[${actionText}] ${JSON.stringify(log, null, 2)}`;
    logContainer.appendChild(logElement);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function displayImage(imageUrl, imageS3Url) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Generated Image';

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

    imageContainer.innerHTML = '';
    imageContainer.appendChild(img);
    imageContainer.appendChild(copyButton);
}

function resetUI() {
    progressBar.style.width = '0';
    logContainer.innerHTML = '';
    imageContainer.innerHTML = '';
    progressContainer.classList.add('hidden');
    logContainer.classList.add('hidden');
}

function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}
