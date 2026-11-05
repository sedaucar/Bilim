// Construct 3 - Science properties video player script

// Map of card animation frames to video filenames
const videoMap = [
    "NESNELDİR",
    "GÖZLEME DAYANIR",
    "SİSTEMLİDİR",
    "TARAFSIZDIR",
    "DENEY YAPILIR",
    "TEKRARLANABİLİR",
    "SORGULAYICIDIR",
    "KANITA DAYANIR",
    "EVRENSELDİR",
    "DEĞİŞME VE GELİŞMEYE AÇIK"
];

// Register C3 startup hook to save the runtime reference
runOnStartup(async runtime => {
    window.c3_runtime = runtime;
    console.log("Construct 3 runtime successfully captured in videoPlayer.js!");
});

// Inject custom CSS styling for the video player overlay
const style = document.createElement("style");
style.innerHTML = `
    .science-video-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        perspective: 1500px;
    }
    
    .science-video-overlay.active {
        opacity: 1;
    }
    
    .science-video-container {
        background: rgba(30, 41, 59, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.7);
        border-radius: 24px;
        padding: 20px;
        position: relative;
        max-width: 90vw;
        width: 850px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        
        /* 3D Flip and scale starting state */
        transform: rotateY(-180deg) scale(0.05);
        transform-style: preserve-3d;
        backface-visibility: hidden;
        opacity: 0;
        
        /* Premium spring/bouncy transition */
        transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease;
        backdrop-filter: blur(10px);
    }
    
    .science-video-overlay.active .science-video-container {
        transform: rotateY(0deg) scale(1);
        opacity: 1;
    }
    
    .science-video-title {
        color: #f8fafc;
        font-family: 'Outfit', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 1px;
        margin: 0 0 4px 0;
        text-transform: uppercase;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        width: 100%;
        text-align: center;
    }
    
    .science-video-player {
        width: 100%;
        aspect-ratio: 16/9;
        border-radius: 12px;
        background: #000;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
    }
    
    .science-video-close-btn {
        position: absolute;
        top: -15px;
        right: -15px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.95);
        border: 2px solid #ffffff;
        color: #ffffff;
        font-size: 18px;
        font-weight: bold;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        transition: background 0.2s, transform 0.2s;
        user-select: none;
        z-index: 1000000;
    }
    
    .science-video-close-btn:hover {
        background: #dc2626;
        transform: scale(1.1);
    }
    
    .science-video-close-btn:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(style);

// Mapping of scientist IDs to their display names in Turkish
const scientistTitles = {
    "edison": "THOMAS EDISON",
    "einstein": "ALBERT EINSTEIN",
    "galileo": "GALILEO GALILEI",
    "harizmi": "EL HARİZMİ",
    "mariecurie": "MARIE CURIE",
    "newton": "ISAAC NEWTON",
    "pastor": "LOUIS PASTEUR",
    "pisagor": "PİSAGOR"
};

let activeVideoOverlay = null;

// game3 choice frame -> matching board-label frame.
// Frames 0-4 and 15 are deliberately absent because they are incorrect choices.
const game3BoardFrameByChoiceFrame = new Map([
    [5, 0],  // İş birliğine açıktır
    [6, 1],  // Disiplinlidir
    [7, 2],  // Planlı çalışır
    [8, 3],  // Sorgulayıcıdır
    [9, 4],  // Araştırmacıdır
    [10, 5], // Çalışkandır
    [11, 6], // Tarafsızdır
    [12, 7], // Sabırlıdır
    [13, 8], // Sistemlidir
    [14, 9]  // Meraklıdır
]);

const game3BoardSlots = Array.from({ length: 10 }, (_, index) => ({
    x: index < 5 ? 675 : 1190,
    y: 360 + (index % 5) * 75
}));

let game3RevealOrder = [];
let game3FeedbackRequestId = 0;
let activeGame3Feedback = null;
let game3CompletionTimer = null;

function closeGame3Feedback() {
    game3FeedbackRequestId++;

    if (!activeGame3Feedback) {
        return;
    }

    const { video, videoUrl, updatePosition } = activeGame3Feedback;
    window.removeEventListener("resize", updatePosition);
    video.pause();
    video.remove();
    URL.revokeObjectURL(videoUrl);
    activeGame3Feedback = null;
}

async function playGame3Feedback(isCorrect) {
    closeGame3Feedback();
    const requestId = game3FeedbackRequestId;
    const runtime = window.c3_runtime;

    if (!runtime) {
        return;
    }

    const filename = isCorrect ? "dogru-cevap.mp4" : "yanlis-cevap.mp4";

    try {
        const blob = await runtime.assets.fetchBlob(filename);
        if (requestId !== game3FeedbackRequestId) {
            return;
        }

        const videoUrl = URL.createObjectURL(blob);
        const video = document.createElement("video");
        video.src = videoUrl;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = "auto";
        video.style.position = "fixed";
        video.style.objectFit = "cover";
        video.style.pointerEvents = "none";
        video.style.zIndex = "99999";
        video.style.background = "#111";

        const updatePosition = () => {
            const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
            const offsetX = (window.innerWidth - 1920 * scale) / 2;
            const offsetY = (window.innerHeight - 1080 * scale) / 2;

            video.style.left = `${offsetX + 141 * scale}px`;
            video.style.top = `${offsetY + 181 * scale}px`;
            video.style.width = `${194 * scale}px`;
            video.style.height = `${264 * scale}px`;
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        document.body.appendChild(video);
        activeGame3Feedback = { video, videoUrl, updatePosition };

        const finish = () => {
            if (activeGame3Feedback?.video === video) {
                closeGame3Feedback();
            }
        };

        video.addEventListener("ended", finish, { once: true });
        video.addEventListener("error", finish, { once: true });

        try {
            await video.play();
        } catch (error) {
            // Some browsers only allow muted autoplay after asynchronous loading.
            video.muted = true;
            await video.play();
        }
    } catch (error) {
        console.error("Game 3 feedback video could not be played:", error);
    }
}

window.resetGame3Board = function() {
    game3RevealOrder = [];
    closeGame3Feedback();

    if (game3CompletionTimer !== null) {
        clearTimeout(game3CompletionTimer);
        game3CompletionTimer = null;
    }

    const boardObject = window.c3_runtime?.objects.tahtaOzellik;
    if (!boardObject) {
        return;
    }

    for (const instance of boardObject.getAllInstances()) {
        const isTitle = instance.animationFrame === 10;
        instance.isVisible = isTitle;
        instance.opacity = 1;
        instance.angle = 0;
    }
};

window.handleGame3Choice = function(choiceFrame) {
    const runtime = window.c3_runtime;
    const boardFrame = game3BoardFrameByChoiceFrame.get(Number(choiceFrame));

    if (!runtime) {
        return false;
    }

    const isCorrect = boardFrame !== undefined;
    playGame3Feedback(isCorrect);

    if (!isCorrect) {
        return false;
    }

    if (game3RevealOrder.includes(boardFrame)) {
        return true;
    }

    const boardObject = runtime.objects.tahtaOzellik;
    if (!boardObject) {
        console.error("tahtaOzellik object type could not be found.");
        return false;
    }

    const target = boardObject
        .getAllInstances()
        .find(instance => instance.animationFrame === boardFrame);

    if (target) {
        const slot = game3BoardSlots[game3RevealOrder.length];
        game3RevealOrder.push(boardFrame);

        target.x = slot.x;
        target.y = slot.y + 28;
        target.opacity = 0;
        target.angle = -0.035;
        target.isVisible = true;

        const startTime = performance.now();
        const duration = 520;

        const animateIn = currentTime => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            target.y = slot.y + 28 * (1 - eased);
            target.opacity = eased;
            target.angle = -0.035 * (1 - eased);

            if (progress < 1) {
                requestAnimationFrame(animateIn);
            } else {
                target.y = slot.y;
                target.opacity = 1;
                target.angle = 0;

                // Start the countdown only after the tenth label finishes animating.
                if (game3RevealOrder.length === game3BoardSlots.length && game3CompletionTimer === null) {
                    game3CompletionTimer = setTimeout(() => {
                        closeGame3Feedback();
                        game3CompletionTimer = null;
                        runtime.goToLayout("end");
                    }, 2000);
                }
            }
        };

        requestAnimationFrame(animateIn);
        return true;
    }

    return false;
};

// Global function to trigger video overlay
window.playScienceVideo = async function(param) {
    const runtime = window.c3_runtime;
    if (!runtime) {
        alert("Construct 3 runtime henüz hazır değil veya yüklenemedi! Lütfen sayfayı yenileyip tekrar deneyin.");
        return;
    }

    // Prevent rapid taps from opening overlapping players.
    if (activeVideoOverlay) {
        return;
    }
    
    let videoTitle = "";
    let baseFilename = "";
    
    // Check if the parameter is a frame index number or a scientist name string
    if (typeof param === "number" || !isNaN(param)) {
        const frameIndex = parseInt(param, 10);
        if (frameIndex < 0 || frameIndex >= videoMap.length) {
            console.error("Invalid frame index: ", frameIndex);
            return;
        }
        videoTitle = videoMap[frameIndex];
        baseFilename = frameIndex + ".mp4";
    } else if (typeof param === "string") {
        const key = param.toLowerCase().trim();
        videoTitle = scientistTitles[key] || param.toUpperCase();
        baseFilename = key + ".mp4";
    } else {
        console.error("Invalid parameter passed to playScienceVideo: ", param);
        return;
    }
    
    const videoName = videoTitle;
    
    // Fetch video file directly as binary blob from virtual filesystem
    let blob = null;
    const pathsToTry = [
        baseFilename,
        "video/" + baseFilename,
        "videos/" + baseFilename
    ];
    
    let lastError = null;
    for (const path of pathsToTry) {
        try {
            console.log("Attempting to fetch blob: " + path);
            blob = await runtime.assets.fetchBlob(path);
            if (blob) {
                console.log("Successfully loaded blob from path: " + path);
                break;
            }
        } catch (e) {
            console.warn("Failed to fetch path " + path + ": ", e);
            lastError = e;
        }
    }
    
    if (!blob) {
        alert("Video dosyası yüklenemedi.\nDenenen yollar:\n" + pathsToTry.join("\n") + "\nHata: " + (lastError ? lastError.message || lastError : "Bilinmiyor"));
        return;
    }
    
    // Create local object URL pointing to binary blob in memory
    const videoUrl = URL.createObjectURL(blob);
    console.log("Created memory blob URL: " + videoUrl);
    
    // Create overlay elements
    const overlay = document.createElement("div");
    overlay.className = "science-video-overlay";
    activeVideoOverlay = overlay;
    
    const container = document.createElement("div");
    container.className = "science-video-container";
    
    const title = document.createElement("div");
    title.className = "science-video-title";
    title.innerText = videoName.toUpperCase();
    
    const video = document.createElement("video");
    video.className = "science-video-player";
    video.src = videoUrl;
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;
    
    // Handle loading errors
    video.addEventListener("error", (e) => {
        console.error("Video loading error:", video.error);
        const errCode = video.error ? video.error.code : "unknown";
        const errMsg = video.error ? video.error.message : "No message";
        alert("Video yüklenemedi.\nMeydana gelen hata: Kod " + errCode + " - " + errMsg);
    });
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "science-video-close-btn";
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Videoyu kapat");
    closeBtn.innerText = "×";
    
    // Assemble overlay
    container.appendChild(title);
    container.appendChild(video);
    container.appendChild(closeBtn);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Animate opening
    setTimeout(() => overlay.classList.add("active"), 50);
    
    // Pause background music
    try {
        const audio = runtime.objects.Audio.getFirstInstance();
        if (audio) {
            audio.setPaused("ses", true);
            audio.setPaused("ses1", true);
        }
    } catch (e) {
        console.error("Error pausing audio in C3: ", e);
    }
    
    // Try to play explicitly
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn("Autoplay was prevented by browser: ", error);
        });
    }
    
    // Function to close video and cleanup
    let isClosing = false;
    const closeVideo = () => {
        if (isClosing) {
            return;
        }
        isClosing = true;
        overlay.classList.remove("active");
        video.pause();
        document.removeEventListener("keydown", onKeyDown);
        
        // Remove from DOM after transition completes (matching 0.8s CSS transition)
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            if (activeVideoOverlay === overlay) {
                activeVideoOverlay = null;
            }
            // Release blob URL memory to prevent leak
            if (videoUrl.startsWith("blob:")) {
                URL.revokeObjectURL(videoUrl);
                console.log("Memory blob URL revoked: " + videoUrl);
            }
        }, 800);
        
        // Resume background music
        try {
            const btnSes = runtime.objects.btnSes.getFirstInstance();
            const audio = runtime.objects.Audio.getFirstInstance();
            if (btnSes && audio && btnSes.instVars.durum === 1) {
                audio.setPaused("ses", false);
                audio.setPaused("ses1", false);
            }
        } catch (e) {
            console.error("Error resuming audio in C3: ", e);
        }
    };

    const onKeyDown = (event) => {
        if (event.key === "Escape") {
            closeVideo();
        }
    };
    
    // Close events
    closeBtn.addEventListener("click", closeVideo);
    document.addEventListener("keydown", onKeyDown);
    
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeVideo();
        }
    });
    
    video.addEventListener("ended", closeVideo);
};
