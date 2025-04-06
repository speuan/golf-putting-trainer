// Show spinner immediately
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loadingSpinner').style.display = 'block';
});

// Wait until OpenCV runtime is initialized
function onOpenCvReady() {
    console.log("✅ OpenCV.js is ready!");
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('imageInput').disabled = false;

    setupUploadHandler();
}

// OpenCV will call this function once it's fully ready
if (typeof cv === 'undefined') {
    console.error("❌ OpenCV not loaded. Check your script src.");
} else {
    cv['onRuntimeInitialized'] = onOpenCvReady;
}

function setupUploadHandler() {
    const input = document.getElementById('imageInput');
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('imageCanvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            detectGolfBall(canvas);
        };
        img.src = URL.createObjectURL(file);
    });
}

function detectGolfBall(canvas) {
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    const circles = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2, 2);

    cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 30, 100, 30, 5, 100);

    if (!circles.empty()) {
        for (let i = 0; i < circles.cols; ++i) {
            const x = circles.data32F[i * 3];
            const y = circles.data32F[i * 3 + 1];
            const radius = circles.data32F[i * 3 + 2];
            cv.circle(src, new cv.Point(x, y), radius, [255, 0, 0, 255], 4);
        }
        cv.imshow('imageCanvas', src);
    } else {
        console.log("No circles detected — keeping original image.");
    }

    src.delete();
    gray.delete();
    circles.delete();
}
