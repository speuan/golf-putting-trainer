let currentStream = null;
let currentFacingMode = "environment"; // Default to rear camera
let isRecording = false;
let frameCaptureInterval = null;
const capturedFrames = []; // Store captured frames as image data URLs

let previousFrame = null; // Store the previous frame for motion detection

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capture frame
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

    let motionDetected = false;
    let motionThresholds = [5, 10, 15, 20]; // Range of thresholds for detecting motion

    motionThresholds.forEach(threshold => {
        let thresholded = new cv.Mat();
        cv.threshold(blurred, thresholded, threshold, 255, cv.THRESH_BINARY);

        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        if (contours.size() > 0) {
            motionDetected = true;
            logMessage(`📸 Motion detected at threshold ${threshold} in ${contours.size()} areas`);

            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 3;
            for (let i = 0; i < contours.size(); i++) {
                let rect = cv.boundingRect(contours.get(i));
                ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            }
        }

        thresholded.delete();
        contours.delete();
        hierarchy.delete();
    });

    if (!motionDetected) {
        logMessage("❌ No motion detected at any threshold");
    }

    grayPrev.delete();
    grayCurr.delete();
    diff.delete();
    blurred.delete();
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        clearInterval(frameCaptureInterval);
        document.getElementById("recordButton").disabled = false;
        document.getElementById("stopButton").disabled = true;

        if (capturedFrames.length > 0) {
            document.getElementById("playbackButton").disabled = false;
            logMessage(`✅ Recording stopped.`);
        } else {
            logMessage("❌ No frames recorded, playback button remains disabled.");
        }
    }
}

function playbackFrames() {
    if (isRecording) {
        stopRecording();
    }

    const video = document.getElementById("cameraFeed");
    const canvas = document.getElementById("captureCanvas");
    const context = canvas.getContext("2d");

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

            let frame = cv.imread(canvas);
            if (previousFrame !== null) {
                detectMotion(previousFrame, frame, context);
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

document.getElementById("switchCamera").addEventListener("click", () => {
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    startCamera(currentFacingMode);
});

document.getElementById("recordButton").addEventListener("click", () => {
    if (!isRecording) {
        capturedFrames.length = 0;
        document.getElementById("playbackButton").disabled = true;
        isRecording = true;
        document.getElementById("recordButton").disabled = true;
        document.getElementById("stopButton").disabled = false;

        logMessage("🔴 Recording started...");
        frameCaptureInterval = setInterval(captureFrame, 100);
    }
});

document.getElementById("stopButton").addEventListener("click", () => {
    stopRecording();
});

document.getElementById("playbackButton").addEventListener("click", () => {
    playbackFrames();
});

// Start with the default camera (rear)
startCamera(currentFacingMode);
