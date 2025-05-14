const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const leftEye = document.getElementById('left-eye');
const rightEye = document.getElementById('right-eye');
const ctx = canvas.getContext('2d');

// Initialize the Face Mesh
const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

// Setup the callback
faceMesh.onResults(onResults);

// Start webcam
async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ // Request webcam access
      video: {
        width: 640,
        height: 480,
        facingMode: 'user'
      },
      audio: false
    });
    
    // Connect stream to video HTML element
    video.srcObject = stream;
    
    // Wait for video to be loaded
    video.onloadedmetadata = () => {
      video.play();
      // Start processing frames
      processFrames();
    };

  } catch (error) {
    console.error('Error accessing webcam:', error);
  }
}

// Process video frames
async function processFrames() {
  if (video.readyState === 4) {
    // Send the current frame to FaceMesh
    await faceMesh.send({image: video});
  }

  // Schedule the next frame; creates loop
  requestAnimationFrame(processFrames);
}

// Callback function; called after faceMesh.send processes a frame
function onResults(results) {
  // Clear the previous drawing from canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Start with the current video frame
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  
  // Check if we have results
  if (results.multiFaceLandmarks) {
    for (const landmarks of results.multiFaceLandmarks) {
      // Draw mesh
      drawConnectors(ctx, landmarks, FACEMESH_TESSELATION,
                    {color: '#C0C0C070', lineWidth: 1});
      // Draw other features
      drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, 
                    {color: '#FF3030'});
      drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE,
                    {color: '#30FF30'});
      drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL,
                    {color: '#E0E0E0'});
      drawConnectors(ctx, landmarks, FACEMESH_LIPS,
                    {color: '#E0E0E0'});
      drawLandmarks(ctx, [landmarks[468]],
                  {color: '#FF3030', lineWidth: 2}); // Right iris
      drawLandmarks(ctx, [landmarks[473]],
                  {color: '#30FF30', lineWidth: 2}); // Left iris
      
      extractEye(landmarks, 'left');
      extractEye(landmarks, 'right');
    }

  }
}


function extractEye(landmarks, side) {
  const eyeIndices = side === 'left' 
    ? [33, 133, 160, 159, 158, 157, 173, 144, 145, 153] // Approx left eye region
    : [362, 263, 387, 386, 385, 384, 398, 373, 374, 380]; // Approx right eye region

  const points = eyeIndices.map(i => landmarks[i]);

  const xs = points.map(p => p.x * canvas.width);
  const ys = points.map(p => p.y * canvas.height);

  const padding = 15

  const minX = Math.max(0, Math.min(...xs) - padding);
  const maxX = Math.min(canvas.width, Math.max(...xs) + padding);
  const minY = Math.max(0, Math.min(...ys) - padding);
  const maxY = Math.min(canvas.height, Math.max(...ys) + padding);

  const width = maxX - minX;
  const height = maxY - minY;

  // Create a temporary canvas to crop eye
  const eyeCanvas = document.createElement('canvas');
  eyeCanvas.width = width;
  eyeCanvas.height = height;
  const eyeCtx = eyeCanvas.getContext('2d');

  // Crop from video
  eyeCtx.drawImage(video, minX, minY, width, height, 0, 0, width, height);

  const dataURL = eyeCanvas.toDataURL();

  if (side === 'left') {
    leftEye.src = dataURL;
  } else {
    rightEye.src = dataURL;
  }
}

setupCamera();