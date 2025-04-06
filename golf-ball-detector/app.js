let cvLoaded = false;

// Spinner visible immediately
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loadingSpinner').style.display = 'block';
    waitForOpenCV(() => {
        console.log("✅ OpenCV.js is ready!");
        document.getElementById('loadingSpinner').style.display = 'none';
        cvLoaded = true;
    });
});

// Poll until OpenCV is ready
function waitForOpenCV(callbackFn) {
    if (typeof cv !== 'undefined' && typeof cv.Mat === 'function') {
        callbackFn();
    } else {
        console.log("Waiting for OpenCV to be ready...");
        setTimeout(() => waitForOpenCV(callbackFn), 50);
    }
}

// Image upload handling
document.getElementById('imageInput').addEventListener('change', (e) => {
    if (!cvLoaded) {
        alert("OpenCV is not ready yet. Please wait...");
        return;
    }

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

// Ball detection
function detectGolfBall(canvas) {
    try {
        const src = cv.imread(canvas);
        const gray = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2, 2);

        const circles = new cv.Mat();
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 30, 100, 30, 5, 100);

        if (!circles.empty()) {
            for (let i = 0; i < circles.cols; ++i) {
                const x = circles.data32F[i * 3];
                const y = circles.data32F[i * 3 + 1];
                const radius = circles.data32F[i * 3 + 2];
                cv.circle(src, new cv.Point(x, y), radius, [255, 0, 0, 255], 4);
            }
        } else {
            console.log("No circles detected.");
        }

        cv.imshow('imageCanvas', src);

        src.delete();
        gray.delete();
        circles.delete();
    } catch (err) {
        console.error("Error during ball detection:", err);
        alert("An error occurred while detecting the ball. See console for details.");
    }
}
