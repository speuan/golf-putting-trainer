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
        let motionData = detectMotion(previousFrame, frame, context);
        detectBall(motionData, context);
    }

    // Save the frame
    previousFrame = frame.clone();
    const frameDataURL = canvas.toDataURL('image/png');
    capturedFrames.push(frameDataURL);

    // Cleanup
    frame.delete();
}

function detectMotion(previous, current, ctx) {
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
    cv.threshold(blurred, thresholded, 10, 255, cv.THRESH_BINARY); // Lowered threshold to detect more motion

    // Find contours (bounding boxes for moving areas)
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    console.log(`Motion areas detected: ${contours.size()}`);

    // Draw bounding boxes around motion
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    for (let i = 0; i < contours.size(); i++) {
        let rect = cv.boundingRect(contours.get(i));
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }

    // Cleanup
    grayPrev.delete();
    grayCurr.delete();
    diff.delete();
    blurred.delete();
    hierarchy.delete();

    return { mask: thresholded, contours: contours };
}

function detectBall(motionData, ctx) {
    let motionMask = motionData.mask;
    let contours = motionData.contours;

    let circles = new cv.Mat();
    cv.HoughCircles(
        motionMask, circles, cv.HOUGH_GRADIENT, 1, 30, 80, 20, 5, 30
    );

    let largestCircleRadius = 0;

    if (circles.rows > 0) {
        for (let i = 0; i < circles.cols; ++i) {
            let x = circles.data32F[i * 3];
            let y = circles.data32F[i * 3 + 1];
            let radius = circles.data32F[i * 3 + 2];

            // Check if circle is inside any motion bounding box
            for (let j = 0; j < contours.size(); j++) {
                let rect = cv.boundingRect(contours.get(j));
                if (x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height) {
                    // Draw detected ball
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, 2 * Math.PI);
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = "red";
                    ctx.stroke();

                    if (radius > largestCircleRadius) {
                        largestCircleRadius = radius;
                    }
                }
            }
        }
    }

    console.log(`Largest detected circle radius: ${largestCircleRadius}px`);

    motionMask.delete();
    circles.delete();
    contours.delete();
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

            let frame = cv.imread(canvas);

            // Ensure previous frame is set before detecting motion
            if (previousFrame !== null) {
                let motionData = detectMotion(previousFrame, frame, context);
                detectBall(motionData, context);
            }
            
            previousFrame = frame.clone();
            frame.delete();
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
