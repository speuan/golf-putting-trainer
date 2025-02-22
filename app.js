let currentStream = null;
let currentFacingMode = "environment"; // Default to rear camera
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as image data URLs

let previousFrame = null; // Store the previous frame for motion detection

function cvReady() {
    logMessage("OpenCV.js is ready!");
}

async function startCamera(facingMode) {
    const video = document.getElementById('cameraFeed');

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }
        });
        video.srcObject = stream;
        currentStream = stream;
    } catch (error) {
        logMessage(`Error accessing camera: ${error}`);
        alert("Unable to access the camera. Please check permissions and try again.");
    }
}

function logMessage(message) {
    let logContainer = document.getElementById("debug-log");
    if (!logContainer) {
        logContainer = document.createElement("div");
        logContainer.id = "debug-log";
        logContainer.style.position = "absolute";
        logContainer.style.bottom = "10px";
        logContainer.style.left = "10px";
        logContainer.style.width = "90%";
        logContainer.style.maxHeight = "200px";
        logContainer.style.overflowY = "scroll";
        logContainer.style.backgroundColor = "rgba(0,0,0,0.7)";
        logContainer.style.color = "white";
        logContainer.style.padding = "10px";
        logContainer.style.fontSize = "14px";
        logContainer.style.borderRadius = "5px";
        document.body.appendChild(logContainer);
    }
    logContainer.innerHTML += `<p>${message}</p>`;
}

function captureFrame() {
    logMessage("Capturing frame...");

    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    let frameDataURL = canvas.toDataURL('image/png');
    
    if (frameDataURL) {
        capturedFrames.push(frameDataURL);
        logMessage(`Frame captured. Total frames: ${capturedFrames.length}`);
    } else {
        logMessage("⚠️ Warning: Frame capture failed!");
    }
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        clearInterval(frameCaptureInterval);
        document.getElementById('recordButton').disabled = false;
        document.getElementById('stopButton').disabled = true;

        if (capturedFrames.length > 0) {
            document.getElementById('playbackButton').disabled = false;
            logMessage(`✅ Recording stopped. Captured ${capturedFrames.length} frames.`);
        } else {
            logMessage("❌ No frames recorded, playback button remains disabled.");
        }
    }
}

function playbackFrames() {
    if (isRecording) {
        stopRecording();
    }

    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');

    if (capturedFrames.length === 0) {
        alert("No frames to playback!");
        return;
    }

    let playbackIndex = 0;

    logMessage("▶️ Starting playback...");

    const playbackInterval = setInterval(() => {
        if (playbackIndex >= capturedFrames.length) {
            clearInterval(playbackInterval);
            canvas.style.display = "none";
            video.style.display = "block";
            logMessage("⏹ Playback finished.");
            return;
        }

        const frameDataURL = capturedFrames[playbackIndex];
        let img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = frameDataURL;

        playbackIndex++;
    }, 100);

    canvas.style.display = "block";
    video.style.display = "none";
}

document.getElementById('switchCamera').addEventListener('click', () => {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    startCamera(currentFacingMode);
});

document.getElementById('recordButton').addEventListener('click', () => {
    if (!isRecording) {
        capturedFrames.length = 0;
        document.getElementById('playbackButton').disabled = true; 
        isRecording = true;
        document.getElementById('recordButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        
        logMessage("🔴 Recording started...");
        frameCaptureInterval = setInterval(captureFrame, 100);
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    stopRecording();
});

document.getElementById('playbackButton').addEventListener('click', () => {
    playbackFrames();
});

// Start with the default camera (rear)
startCamera(currentFacingMode);
