let currentStream = null;
let currentFacingMode = "environment"; // Default to the rear camera

async function startCamera(facingMode) {
    const video = document.getElementById('cameraFeed');

    // Stop any existing stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        // Request camera access with the desired facing mode
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode
            }
        });
        video.srcObject = stream;
        currentStream = stream; // Save the current stream
    } catch (error) {
        console.error("Error accessing camera: ", error);
        alert("Unable to access the camera. Please check permissions and try again.");
    }
}

document.getElementById('switchCamera').addEventListener('click', () => {
    // Toggle between "user" (front) and "environment" (rear) cameras
    currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
    startCamera(currentFacingMode);
});

// Start with the default camera (rear)
startCamera(currentFacingMode);
