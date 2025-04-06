let cvLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loadingSpinner').style.display = 'block';
  waitForCVLoad();
});

function waitForCVLoad() {
  if (typeof cv !== 'undefined' && cv['onRuntimeInitialized']) {
    cv['onRuntimeInitialized'] = () => {
      console.log("✅ OpenCV.js runtime initialized!");
      document.getElementById('loadingSpinner').style.display = 'none';
      cvLoaded = true;
      enableImageUpload();
    };
  } else {
    console.log("Waiting for OpenCV...");
    setTimeout(waitForCVLoad, 50);
  }
}

function enableImageUpload() {
  document.getElementById('imageInput').addEventListener('change', (e) => {
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
  try {
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    const circles = new cv.Mat();

    // Preprocessing
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(9, 9), 2, 2);

    // Detect circles
    cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 30, 100, 30, 5, 100);

    if (!circles.empty()) {
      for (let i = 0; i < circles.cols; ++i) {
        const x = circles.data32F[i * 3];
        const y = circles.data32F[i * 3 + 1];
        const radius = circles.data32F[i * 3 + 2];
        // Draw detected circles
        cv.circle(src, new cv.Point(x, y), radius, [255, 0, 0, 255], 4);
      }
      // Only redraw if circles found
      cv.imshow('imageCanvas', src);
    } else {
      console.log("No circles detected — keeping original image.");
      // No need to overwrite canvas
    }

    src.delete();
    gray.delete();
    circles.delete();
  } catch (err) {
    console.error("Error during ball detection:", err);
    alert("An error occurred while detecting the ball. See console for details.");
  }
}
