let data = [];

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let currentLandmarks = null;
let faceMeshActive = true; // !labeling

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

    const entry = {
        label: classification,
        landmarks: currentLandmarks.map(p => ({ x: p.x, y: p.y, z: p.z }))
    };

    data.push(entry);

    // Resume everything
    video.play();
    faceMeshActive = true;
    canvas.style.display = 'none';
    video.style.display = 'block';
    document.getElementById('focusedBtn').style.display = 'none';
    document.getElementById('distractedBtn').style.display = 'none';
}

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
