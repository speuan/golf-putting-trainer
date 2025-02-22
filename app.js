let currentStream = null;
let currentFacingMode = "environment"; // Default to rear camera
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as image data URLs

let previousFrame = null; // Store the previous frame for motion detection

function cvReady() {
    console.log("OpenCV.js is ready!");
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
        console.error("Error accessing camera: ", error);
        alert("Unable to access the camera. Please check permissions and try again.");
    }
}

function captureFrame() {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('captureCanvas');
    const context = canvas.getContext('2d');

    // Draw current frame onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to OpenCV image
    let frame = cv.imread(canvas);

    if (previousFrame !== null) {
        let motionMask = detectMotion(previousFrame, frame);
        detectBall(motionMask); // Only analyze motion areas for ball detection
    }

    // Save the frame
    previousFrame = frame.clone();
    const frameDataURL = canvas.toDataURL('image/png');
    capturedFrames.push(frameDataURL);

    // Cleanup
    frame.delete();
}

function detectMotion(previous, current) {
    let grayPrev = new cv.Mat();
    let grayCurr = new cv.Mat();

    // Convert both frames to grayscale
    cv.cvtColor(previous, grayPrev, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(current, grayCurr, cv.COLOR_RGBA2GRAY);

    let diff = new cv.Mat();
    cv.absdiff(grayPrev, grayCurr, diff); // Compute the difference between frames

    let blurred = new cv.Mat();
    cv.GaussianBlur(diff, blurred, new cv.Size(5, 5), 0);

    let thresholded = new cv.Mat();
    cv.threshold(blurred, thresholded, 25, 255, cv.THRESH_BINARY); // Highlight motion

    // Cleanup
    grayPrev.delete();
    grayCurr.delete();
    diff.delete();
    blurred.delete();

    return thresholded; // Return motion mask
}

function detectBall(motionMask) {
    let circles = new cv.Mat();
    cv.HoughCircles(
        motionMask, circles, cv.HOUGH_GRADIENT, 1, 30, 80, 20, 5, 30
    );

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

    // Cleanup
    motionMask.delete();
    circles.delete();
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

            detectBall(canvas); // Process frame for ball detection
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
