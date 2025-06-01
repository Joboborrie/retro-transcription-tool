/**
 * audio-recorder.js - Handles browser-based audio recording functionality
 */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.audioUrl = null;
        this.audioStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.isRecording = false;
        this.startTime = 0;
        this.timecodeInterval = null;
        
        // VU meter elements
        this.leftVUNeedle = document.querySelector('.left-vu .vu-needle');
        this.rightVUNeedle = document.querySelector('.right-vu .vu-needle');
        
        // Timecode display
        this.timecodeDisplay = document.querySelector('.timecode-value');
        
        // Animation frames
        this.animationFrame = null;
        
        // Reel animation elements
        this.leftReel = document.querySelector('.left-reel .reel-inner');
        this.rightReel = document.querySelector('.right-reel .reel-inner');
        
        // Bind methods
        this.startRecording = this.startRecording.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.updateTimecode = this.updateTimecode.bind(this);
        this.analyzeAudio = this.analyzeAudio.bind(this);
        this.animateReels = this.animateReels.bind(this);
        this.getAvailableMicrophones = this.getAvailableMicrophones.bind(this);
    }
    
    /**
     * Get available microphone devices
     * @returns {Promise} Promise resolving to array of available audio input devices
     */
    async getAvailableMicrophones() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audioinput');
        } catch (error) {
            console.error('Error getting audio devices:', error);
            return [];
        }
    }
    
    /**
     * Start audio recording
     * @param {string} deviceId - Optional device ID for specific microphone
     * @returns {Promise} Promise resolving when recording starts
     */
    async startRecording(deviceId = null) {
        try {
            // Reset state
            this.audioChunks = [];
            this.audioBlob = null;
            this.audioUrl = null;
            
            // Set up audio constraints
            const constraints = {
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            };
            
            // Get audio stream
            this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Create media recorder
            this.mediaRecorder = new MediaRecorder(this.audioStream);
            
            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.audioUrl = URL.createObjectURL(this.audioBlob);
                
                // Notify UI that recording is complete
                const event = new CustomEvent('recordingComplete', {
                    detail: { audioBlob: this.audioBlob, audioUrl: this.audioUrl }
                });
                document.dispatchEvent(event);
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            
            // Set up audio analysis for VU meters
            this.setupAudioAnalysis();
            
            // Start timecode
            this.startTime = Date.now();
            this.updateTimecode();
            this.timecodeInterval = setInterval(this.updateTimecode, 1000);
            
            // Start reel animation
            this.animateReels();
            
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }
    
    /**
     * Stop audio recording
     * @returns {Promise} Promise resolving to the recorded audio blob
     */
    async stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            return null;
        }
        
        return new Promise((resolve) => {
            // Set up one-time event handler for stop completion
            const originalOnStop = this.mediaRecorder.onstop;
            this.mediaRecorder.onstop = (event) => {
                // Call original handler
                if (originalOnStop) {
                    originalOnStop(event);
                }
                
                // Resolve promise with audio blob
                resolve(this.audioBlob);
            };
            
            // Stop recording
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Stop all tracks in the stream
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
            }
            
            // Clean up audio analysis
            if (this.audioContext) {
                cancelAnimationFrame(this.animationFrame);
                this.audioContext.close();
                this.audioContext = null;
                this.analyser = null;
            }
            
            // Stop timecode update
            clearInterval(this.timecodeInterval);
            
            // Reset VU meters
            this.updateVUMeters([0, 0]);
        });
    }
    
    /**
     * Set up audio analysis for VU meters
     */
    setupAudioAnalysis() {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyser
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        // Connect audio stream to analyser
        const source = this.audioContext.createMediaStreamSource(this.audioStream);
        source.connect(this.analyser);
        
        // Start analysis
        this.analyzeAudio();
    }
    
    /**
     * Analyze audio for VU meters
     */
    analyzeAudio() {
        if (!this.analyser || !this.isRecording) {
            return;
        }
        
        // Get audio data
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average levels for left and right channels
        // (For mono, we'll use the same value for both)
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        
        const average = sum / bufferLength;
        const level = average / 255; // Normalize to 0-1
        
        // Update VU meters
        this.updateVUMeters([level, level]);
        
        // Continue analysis
        this.animationFrame = requestAnimationFrame(this.analyzeAudio);
    }
    
    /**
     * Update VU meters with audio levels
     * @param {Array} levels - Array of [left, right] channel levels (0-1)
     */
    updateVUMeters(levels) {
        const [left, right] = levels;
        
        // Calculate rotation angles (0 to 90 degrees)
        const leftAngle = left * 90;
        const rightAngle = right * 90;
        
        // Apply rotation to needles
        if (this.leftVUNeedle) {
            this.leftVUNeedle.style.transform = `rotate(${leftAngle}deg)`;
        }
        
        if (this.rightVUNeedle) {
            this.rightVUNeedle.style.transform = `rotate(${rightAngle}deg)`;
        }
    }
    
    /**
     * Update timecode display
     */
    updateTimecode() {
        if (!this.isRecording) {
            return;
        }
        
        // Calculate elapsed time in seconds
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Format as HH:MM:SS
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
        
        const timecode = `${hours}:${minutes}:${seconds}`;
        
        // Update display
        if (this.timecodeDisplay) {
            this.timecodeDisplay.textContent = timecode;
        }
        
        // Dispatch timecode update event
        const event = new CustomEvent('timecodeUpdate', {
            detail: { timecode }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Animate tape reels during recording
     */
    animateReels() {
        if (!this.isRecording) {
            return;
        }
        
        // Calculate rotation based on time
        const now = Date.now();
        const leftRotation = (now / 50) % 360;
        const rightRotation = (now / 40) % 360;
        
        // Apply rotation to reels
        if (this.leftReel) {
            this.leftReel.style.transform = `rotate(${leftRotation}deg)`;
        }
        
        if (this.rightReel) {
            this.rightReel.style.transform = `rotate(${rightRotation}deg)`;
        }
        
        // Continue animation
        requestAnimationFrame(this.animateReels);
    }
    
    /**
     * Get the recorded audio as a Blob
     * @returns {Blob} Audio blob
     */
    getAudioBlob() {
        return this.audioBlob;
    }
    
    /**
     * Get the URL for the recorded audio
     * @returns {string} Audio URL
     */
    getAudioUrl() {
        return this.audioUrl;
    }
    
    /**
     * Check if recording is in progress
     * @returns {boolean} True if recording
     */
    isCurrentlyRecording() {
        return this.isRecording;
    }
}
