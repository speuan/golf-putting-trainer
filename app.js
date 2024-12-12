let currentStream = null;
let currentFacingMode = "environment";
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as image data URLs

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
    } catch (error) {
        console.error("Error accessing camera: ", error);
        alert("Unable to access the camera. Please check permissions and try again.");
    }
}

function captureFrame() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Save the canvas content as an image data URL
    const frameDataURL = canvas.toDataURL('image/png');
    capturedFrames.push(frameDataURL);
}

function playbackFrames() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');

    let playbackIndex = 0;

    // Ensure canvas matches video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

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

    // Show the canvas and hide the video during playback
    canvas.style.display = "block";
    video.style.display = "none";
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
    if (isRecording) {
        isRecording = false;
        clearInterval(frameCaptureInterval);
        document.getElementById('recordButton').disabled = false;
        document.getElementById('stopButton').disabled = true;
        document.getElementById('playbackButton').disabled = false;
    }
});

document.getElementById('playbackButton').addEventListener('click', () => {
    playbackFrames();
});

// Start with the default camera (rear)
startCamera(currentFacingMode);
