const video = document.getElementById('video');

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });
    video.srcObject = stream;
  } catch (err) {
    console.error('Failed to access webcam:', err);
  }
}

setupCamera();