(async function initCamera() {
    const video = document.getElementById('cameraFeed');

    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error("Error accessing camera: ", error);
        alert("Unable to access the camera. Please check permissions and try again.");
    }
})();
