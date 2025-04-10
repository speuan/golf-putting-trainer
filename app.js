let currentStream = null;
let currentFacingMode = "environment"; // Default to rear camera
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as image data URLs

let previousFrame = null; // Store the previous frame for motion detection
let debugMode = true; // Toggle debug mode to visualize motion detection

function cvReady() {
    logMessage("✅ OpenCV.js is ready!");
}

async function startCamera(facingMode) {
    const video = document.getElementById("cameraFeed");

    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
        });
        video.srcObject = stream;
        currentStream = stream;

        video.onloadedmetadata = () => {
            logMessage(`📷 Video stream ready: ${video.videoWidth}x${video.videoHeight}`);
        };
    } catch (error) {
        logMessage(`❌ Error accessing camera: ${error}`);
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
    const video = document.getElementById("cameraFeed");
    const canvas = document.getElementById("captureCanvas");
    const context = canvas.getContext("2d");

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    let frameDataURL = canvas.toDataURL("image/png");

    if (frameDataURL.startsWith("data:image/png")) {
        capturedFrames.push(frameDataURL);
    }

    let frame = cv.imread(canvas);

    if (previousFrame !== null) {
        detectMotion(previousFrame, frame, context);
    }

    previousFrame = frame.clone();
    frame.delete();
}

function detectMotion(previous, current, ctx) {
    let grayPrev = new cv.Mat();
    let grayCurr = new cv.Mat();

    cv.cvtColor(previous, grayPrev, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(current, grayCurr, cv.COLOR_RGBA2GRAY);

    let diff = new cv.Mat();
    cv.absdiff(grayPrev, grayCurr, diff);

    let blurred = new cv.Mat();
    cv.GaussianBlur(diff, blurred, new cv.Size(5, 5), 0);

    let thresholdValues = [5, 10, 15, 20]; // Try multiple thresholds dynamically
    let motionDetected = false;

    for (let threshold of thresholdValues) {
        let thresholded = new cv.Mat();
        cv.threshold(blurred, thresholded, threshold, 255, cv.THRESH_BINARY);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        if (contours.size() > 0) {
            motionDetected = true;
            logMessage(`📸 Motion detected at threshold ${threshold} in ${contours.size()} areas.`);

            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 3;

            for (let i = 0; i < contours.size(); i++) {
                let rect = cv.boundingRect(contours.get(i));

                if (rect.width > 10 && rect.height > 10) {
                    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                }
            }
        }

        thresholded.delete();
        contours.delete();
        hierarchy.delete();
    }

    if (!motionDetected) {
        logMessage("❌ No motion detected.");
    }

    if (debugMode) {
        showMotionMask(diff);
    }

    grayPrev.delete();
    grayCurr.delete();
    diff.delete();
    blurred.delete();
}

function showMotionMask(thresholded) {
    let debugCanvas = document.getElementById("debugCanvas");
    if (!debugCanvas) {
        debugCanvas = document.createElement("canvas");
        debugCanvas.id = "debugCanvas";
        debugCanvas.style.position = "absolute";
        debugCanvas.style.top = "10px";
        debugCanvas.style.right = "10px";
        debugCanvas.style.width = "150px";
        debugCanvas.style.height = "150px";
        debugCanvas.style.border = "2px solid red";
        document.body.appendChild(debugCanvas);
    }
    let debugCtx = debugCanvas.getContext("2d");
    debugCanvas.width = thresholded.cols;
    debugCanvas.height = thresholded.rows;
    let imgData = new ImageData(new Uint8ClampedArray(thresholded.data), thresholded.cols, thresholded.rows);
    debugCtx.putImageData(imgData, 0, 0);
}

document.getElementById("recordButton").addEventListener("click", () => {
    if (!isRecording) {
        capturedFrames.length = 0;
        document.getElementById("playbackButton").disabled = true;
        isRecording = true;
        document.getElementById("recordButton").disabled = true;
        document.getElementById("stopButton").disabled = false;

        frameCaptureInterval = setInterval(captureFrame, 100);
    }
});

document.getElementById("stopButton").addEventListener("click", () => {
    clearInterval(frameCaptureInterval);
    isRecording = false;
    document.getElementById("recordButton").disabled = false;
    document.getElementById("stopButton").disabled = true;
    if (capturedFrames.length > 0) {
        document.getElementById("playbackButton").disabled = false;
    }
});

document.getElementById("playbackButton").addEventListener("click", () => {
    playbackFrames();
});

startCamera(currentFacingMode);
