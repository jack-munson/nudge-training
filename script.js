const video = document.getElementById('video');
// const canvas = document.getElementById('canvas');
// const prediction_text = document.getElementById("prediction-text");
// const ctx = canvas.getContext('2d');

let model;

async function loadModel() {
  model = await tf.loadLayersModel('/model/tfjs_model/model.json');
}

const leftEyeIndices = [33, 133, 160, 159, 158, 157, 173];
const rightEyeIndices = [362, 263, 387, 386, 385, 384, 398];
const leftIrisIndex = 468;
const rightIrisIndex = 473;

function getBoundingBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function getNormalizedIrisPosition(eyeIndices, irisIndex, landmarks) {
  const eyePoints = eyeIndices.map(i => landmarks[i]);
  const iris = landmarks[irisIndex];
  const { minX, minY, maxX, maxY } = getBoundingBox(eyePoints);

  const normX = (iris.x - minX) / (maxX - minX);
  const normY = (iris.y - minY) / (maxY - minY);

  return [normX, normY];
}

let predictionHistory = [];
let numPredictions = 20;

async function predict(landmarks) {
  if (!model) {
    console.log("NO MODEL");
    return;
  }
  console.log("MODEL");

  const left = getNormalizedIrisPosition(leftEyeIndices, leftIrisIndex, landmarks);
  const right = getNormalizedIrisPosition(rightEyeIndices, rightIrisIndex, landmarks);

  const input = tf.tensor2d([[...left, ...right]]);
  const prediction = model.predict(input);
  const result = await prediction.data();
  predictionHistory.push(result[0])
  if (predictionHistory.length >= numPredictions) {
    const avg = predictionHistory.reduce((a, b) => a + b) / predictionHistory.length;
    prediction_text.innerText = avg > 0.5 ? "Distracted" : "Focused";
    document.body.style.backgroundColor = avg > 0.5 ? "Red" : "Green";
    predictionHistory = [];
  }
}

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
  // await loadModel();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ // Request webcam access
      video: {
        width: 640,
        height: 480,
        frameRate: { max: 5 },
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
      // processFrames();
    };

  } catch (error) {
    console.error('Error accessing webcam:', error.name);
  }
}

// Process video frames
async function processFrames() {
  if (video.readyState === 4) {
    // Send the current frame to FaceMesh
    await faceMesh.send({image: video});
  }

  // Schedule the next frame; creates loop
  setTimeout(() => requestAnimationFrame(processFrames), 50);
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
      predict(landmarks);
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
    }

  }
}