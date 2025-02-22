let currentStream = null;
let currentFacingMode = "environment"; // Default to rear camera
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as image data URLs

function cvReady() {
    console.log("OpenCV.js is ready!");
}

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
        document.getElementById('playbackButton').disabled = capturedFrames.length === 0;
    }
}

function detectBall(frame) {
    let src = cv.imread(frame); // Load the image
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale

    let blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0); // Apply Gaussian blur

    let circles = new cv.Mat();
    cv.HoughCircles(
        blurred, circles, cv.HOUGH_GRADIENT, 1, 30, 80, 20, 5, 30
    ); // Detect circles (adjust parameters if needed)

    let canvas = document.getElementById('captureCanvas');
    let ctx = canvas.getContext("2d");

    if (circles.rows > 0) {
        for (let i = 0; i < circles.cols; ++i) {
            let x = circles.data32F[i * 3];
            let y = circles.data32F[i * 3 + 1];
            let radius = circles.data32F[i * 3 + 2];
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.lineWidth = 3;
            ctx.strokeStyle = "red";
            ctx.stroke();
        }
    }

    // Clean up
    src.delete();
    gray.delete();
    blurred.delete();
    circles.delete();
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

    const playbackInterval = setInterval(() => {
        if (playbackIndex >= capturedFrames.length) {
            clearInterval(playbackInterval);
            canvas.style.display = "none";
            video.style.display = "block";
            return;
        }

        const frameDataURL = capturedFrames[playbackIndex];
        let img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);

            detectBall(canvas); // Process the frame for ball detection
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
        isRecording = true;
        document.getElementById('recordButton').disabled = true;
        document.getElementById('stopButton').disabled = false;
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
