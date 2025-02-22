let currentStream = null;
let currentFacingMode = "environment"; // Default to rear camera
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as data URLs

async function startCamera(facingMode) {
    const video = document.getElementById('cameraFeed');

    // Stop any existing stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }
        });
        video.srcObject = stream;
        currentStream = stream; // Save the current stream

        video.onloadedmetadata = () => {
            // Ensure canvas matches video size dynamically
            const canvas = document.getElementById('captureCanvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            console.log(`Video size: ${video.videoWidth}x${video.videoHeight}`);
        };
    } catch (error) {
        console.error("Error accessing camera: ", error);
        alert("Unable to access the camera. Please check permissions and try again.");
    }
}

function captureFrame() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');

    // Draw the current video frame onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save the frame as a data URL
    const frameDataURL = canvas.toDataURL('image/png');
    capturedFrames.push(frameDataURL);
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        clearInterval(frameCaptureInterval);
        document.getElementById('recordButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        document.getElementById('playbackButton').disabled = capturedFrames.length === 0; // Enable playback only if frames exist
    }
}

function playbackFrames() {
    // Stop recording before playback
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

    // Show the canvas and hide the video during playback
    canvas.style.display = "block";
    video.style.display = "none";

    let playbackIndex = 0;

    const playbackInterval = setInterval(() => {
        if (playbackIndex >= capturedFrames.length) {
            clearInterval(playbackInterval);
            canvas.style.display = "none"; // Hide canvas after playback
            video.style.display = "block"; // Restore video feed display
            return;
        }

        // Display the current frame on the canvas
        const frameDataURL = capturedFrames[playbackIndex];
        const img = new Image();
        img.onload = () => {
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = frameDataURL;

        playbackIndex++;
    }, 100); // Display each frame for 100ms (~10 FPS)
}

document.getElementById('switchCamera').addEventListener('click', () => {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    startCamera(currentFacingMode);
});

document.getElementById('recordButton').addEventListener('click', () => {
    if (!isRecording) {
        capturedFrames.length = 0; // Clear any previously captured frames
        isRecording = true;
        document.getElementById('recordButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
        frameCaptureInterval = setInterval(captureFrame, 100); // Capture a frame every 100ms (~10 FPS)
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
