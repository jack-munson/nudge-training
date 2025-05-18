let data = [];

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const focusedCounter = document.getElementById('focused-counter');
const distractedCounter = document.getElementById('distracted-counter');
const ctx = canvas.getContext('2d');

let focused = 0;
let distracted = 0; 

let currentLandmarks = null;
let faceMeshActive = true; // !labeling

const leftEyeIndices = [33, 133, 160, 159, 158, 157, 173];
const rightEyeIndices = [362, 263, 387, 386, 385, 384, 398];
const leftIrisIndex = 468;
const rightIrisIndex = 473;

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

faceMesh.onResults(results => {
    console.log("Sending");

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        currentLandmarks = results.multiFaceLandmarks[0];
    }
});

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

// Process frame, only if not labeling
async function processFrames() {
    if (video.readyState === 4 && faceMeshActive) {
        await faceMesh.send({ image: video });
    }
    requestAnimationFrame(processFrames);
}

// After clicking "Capture"
function capture() {
    faceMeshActive = false; // Pause faceMesh while labeling
    video.pause();

    // Freeze the current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.style.display = 'none';
    canvas.style.display = 'block';

    document.getElementById('focusedBtn').style.display = 'inline';
    document.getElementById('distractedBtn').style.display = 'inline';
}

// After clicking "Focused" or "Distracted"
function label(classification) {
    if (!currentLandmarks) return;

    const leftXY = getNormalizedIrisPosition(leftEyeIndices, leftIrisIndex, currentLandmarks);
    const rightXY = getNormalizedIrisPosition(rightEyeIndices, rightIrisIndex, currentLandmarks);

    const entry = {
        label: classification,
        features: [...leftXY, ...rightXY] // [lx, ly, rx, ry]
    };

    data.push(entry);

    // Resume everything
    video.play();
    faceMeshActive = true;
    canvas.style.display = 'none';
    video.style.display = 'block';
    document.getElementById('focusedBtn').style.display = 'none';
    document.getElementById('distractedBtn').style.display = 'none';
    if (classification == "focused") {
        focused++;
        focusedCounter.innerText = `Focused: ${focused}`;
    } else {
        distracted++;
        distractedCounter.innerText = `Distracted: ${distracted}`;
    }
}

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault(); // Prevent page scroll
      capture();
    } else if (event.key.toLowerCase() === 'f') {
      label('focused');
    } else if (event.key.toLowerCase() === 'd') {
      label('distracted');
    }
});

function downloadJSON() {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `data.json`;
  a.click();
  URL.revokeObjectURL(url);
}

setupCamera();
