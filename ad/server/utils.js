function sendProgressEvent(data, clients) {
  const progressEvent = {
    progress: data.progress,
    log: `Progress: ${data.progress}%`,
    action: data.action
  };

  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(progressEvent)}\n\n`);
  });
}

module.exports = {
  sendProgressEvent
};