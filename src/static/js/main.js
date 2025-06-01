/**
 * main.js - Main application logic for Retro Transcription Tool
 */

// Initialize components
const audioRecorder = new AudioRecorder();
const uiControls = new UIControls();
const apiClient = new ApiClient();

// Application state
let currentSessionId = null;
let isRecording = false;
let isPlaying = false;
let currentAudioUrl = null;
let audioPlayer = null;

// DOM elements
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const playBtn = document.getElementById('playBtn');
const rewindBtn = document.getElementById('rewindBtn');
const forwardBtn = document.getElementById('forwardBtn');
const ejectBtn = document.getElementById('ejectBtn');
const audioFileInput = document.getElementById('audioFileInput');

// Initialize application
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Initialize application
 */
async function initApp() {
    // Set up event listeners
    setupEventListeners();
    
    // Get available microphones
    const devices = await audioRecorder.getAvailableMicrophones();
    uiControls.populateMicrophoneDropdown(devices);
    
    // Set up parameter listeners
    uiControls.setupParameterListeners(handleParameterChange);
    
    // Set up script listeners
    uiControls.setupScriptListeners({
        load: handleScriptLoad,
        save: handleScriptSave,
        apply: handleScriptApply
    });
    
    // Set up output listeners
    uiControls.setupOutputListeners({
        generate: handleGenerateOutput,
        download: handleDownloadOutput
    });
    
    // Update status
    uiControls.updateStatus('Ready to record or load audio');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Transport controls
    recordBtn.addEventListener('click', toggleRecording);
    stopBtn.addEventListener('click', stopAll);
    playBtn.addEventListener('click', togglePlayback);
    rewindBtn.addEventListener('click', rewindAudio);
    forwardBtn.addEventListener('click', forwardAudio);
    ejectBtn.addEventListener('click', ejectAudio);
    
    // File upload
    audioFileInput.addEventListener('change', handleFileUpload);
    
    // Recording complete event
    document.addEventListener('recordingComplete', handleRecordingComplete);
    
    // Timecode update event
    document.addEventListener('timecodeUpdate', handleTimecodeUpdate);
}

/**
 * Toggle recording state
 */
async function toggleRecording() {
    if (isRecording) {
        await stopRecording();
    } else {
        await startRecording();
    }
}

/**
 * Start audio recording
 */
async function startRecording() {
    // Reset state
    ejectAudio();
    
    // Get selected microphone
    const deviceId = uiControls.getSelectedMicrophoneId();
    
    // Update UI
    uiControls.updateStatus('Starting recording...');
    
    // Start recording
    const success = await audioRecorder.startRecording(deviceId);
    
    if (success) {
        isRecording = true;
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<i class="fas fa-circle"></i> RECORDING';
        uiControls.updateStatus('Recording in progress');
    } else {
        uiControls.updateStatus('Failed to start recording. Check microphone permissions.');
    }
}

/**
 * Stop audio recording
 */
async function stopRecording() {
    if (!isRecording) return;
    
    // Update UI
    uiControls.updateStatus('Stopping recording...');
    
    // Stop recording
    const audioBlob = await audioRecorder.stopRecording();
    isRecording = false;
    
    // Update UI
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<i class="fas fa-circle"></i> RECORD';
    
    if (audioBlob) {
        uiControls.updateStatus('Processing recording...');
        
        // Upload to server
        const result = await apiClient.recordAudio(audioBlob);
        
        if (result.success) {
            currentSessionId = result.session_id;
            uiControls.updateStatus('Recording uploaded. Transcribing...');
            
            // Start transcription
            await transcribeAudio();
        } else {
            uiControls.updateStatus(`Error: ${result.error || 'Failed to upload recording'}`);
        }
    } else {
        uiControls.updateStatus('No audio recorded');
    }
}

/**
 * Handle recording complete event
 * @param {CustomEvent} event - Recording complete event
 */
function handleRecordingComplete(event) {
    const { audioBlob, audioUrl } = event.detail;
    
    // Store audio URL for playback
    currentAudioUrl = audioUrl;
}

/**
 * Handle timecode update event
 * @param {CustomEvent} event - Timecode update event
 */
function handleTimecodeUpdate(event) {
    const { timecode } = event.detail;
    
    // Update parameter controls with current timecode
    const parameters = uiControls.getParameters();
    parameters.timecode = timecode;
    
    // No need to send to server during recording
}

/**
 * Stop all operations
 */
function stopAll() {
    if (isRecording) {
        stopRecording();
    }
    
    if (isPlaying) {
        stopPlayback();
    }
}

/**
 * Toggle audio playback
 */
function togglePlayback() {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

/**
 * Start audio playback
 */
function startPlayback() {
    if (!currentAudioUrl) {
        uiControls.updateStatus('No audio available for playback');
        return;
    }
    
    // Create audio player if needed
    if (!audioPlayer) {
        audioPlayer = new Audio(currentAudioUrl);
        
        // Set up ended event
        audioPlayer.addEventListener('ended', () => {
            stopPlayback();
        });
    }
    
    // Start playback
    audioPlayer.play();
    isPlaying = true;
    
    // Update UI
    playBtn.innerHTML = '<i class="fas fa-pause"></i> PAUSE';
    uiControls.updateStatus('Playing audio');
}

/**
 * Stop audio playback
 */
function stopPlayback() {
    if (!isPlaying || !audioPlayer) return;
    
    // Stop playback
    audioPlayer.pause();
    isPlaying = false;
    
    // Update UI
    playBtn.innerHTML = '<i class="fas fa-play"></i> PLAY';
    uiControls.updateStatus('Playback stopped');
}

/**
 * Rewind audio
 */
function rewindAudio() {
    if (!audioPlayer) return;
    
    // Rewind 5 seconds
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5);
    uiControls.updateStatus('Rewinding');
}

/**
 * Fast forward audio
 */
function forwardAudio() {
    if (!audioPlayer) return;
    
    // Forward 5 seconds
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5);
    uiControls.updateStatus('Fast forwarding');
}

/**
 * Eject current audio
 */
function ejectAudio() {
    // Stop any active operations
    stopAll();
    
    // Reset state
    currentSessionId = null;
    currentAudioUrl = null;
    audioPlayer = null;
    apiClient.clearSession();
    
    // Reset UI
    uiControls.displayTranscription([]);
    document.querySelector('.timecode-value').textContent = '00:00:00';
    
    // Update VU meters
    const leftVUNeedle = document.querySelector('.left-vu .vu-needle');
    const rightVUNeedle = document.querySelector('.right-vu .vu-needle');
    
    if (leftVUNeedle) leftVUNeedle.style.transform = 'rotate(0deg)';
    if (rightVUNeedle) rightVUNeedle.style.transform = 'rotate(0deg)';
    
    // Update status
    uiControls.updateStatus('Ready to record or load audio');
}

/**
 * Handle file upload
 * @param {Event} event - File input change event
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Reset state
    ejectAudio();
    
    // Update UI
    uiControls.updateStatus(`Uploading file: ${file.name}`);
    
    // Upload file
    const result = await apiClient.uploadAudio(file);
    
    if (result.success) {
        currentSessionId = result.session_id;
        
        // Create object URL for playback
        currentAudioUrl = URL.createObjectURL(file);
        
        uiControls.updateStatus('File uploaded. Transcribing...');
        
        // Start transcription
        await transcribeAudio();
    } else {
        uiControls.updateStatus(`Error: ${result.error || 'Failed to upload file'}`);
    }
    
    // Reset file input
    event.target.value = '';
}

/**
 * Transcribe audio
 */
async function transcribeAudio() {
    if (!currentSessionId) {
        uiControls.updateStatus('No active session');
        return;
    }
    
    // Get current parameters
    const parameters = uiControls.getParameters();
    
    // Update UI
    uiControls.updateStatus('Transcribing audio...');
    
    // Start transcription
    const result = await apiClient.transcribeAudio(parameters);
    
    if (result.success) {
        // Display transcription
        uiControls.displayTranscription(result.up_sots);
        uiControls.updateStatus(`Transcription complete. Found ${result.up_sots_count} segments.`);
    } else {
        uiControls.updateStatus(`Error: ${result.error || 'Failed to transcribe audio'}`);
    }
}

/**
 * Handle parameter change
 * @param {Object} parameters - Updated parameters
 */
async function handleParameterChange(parameters) {
    if (!currentSessionId) return;
    
    // Update UI
    uiControls.updateStatus('Updating parameters...');
    
    // Send to server
    const result = await apiClient.setParameters(parameters);
    
    if (result.success) {
        // Update transcription display if up-sots were returned
        if (result.up_sots) {
            uiControls.displayTranscription(result.up_sots);
        }
        
        uiControls.updateStatus('Parameters updated');
    } else {
        uiControls.updateStatus(`Error: ${result.error || 'Failed to update parameters'}`);
    }
}

/**
 * Handle script load
 * @param {string} scriptText - Loaded script text
 */
function handleScriptLoad(scriptText) {
    uiControls.updateStatus('Script loaded');
}

/**
 * Handle script save
 * @param {string} scriptText - Script text to save
 */
function handleScriptSave(scriptText) {
    if (!scriptText) {
        uiControls.updateStatus('No script to save');
        return;
    }
    
    // Create download link
    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    uiControls.updateStatus('Script saved');
}

/**
 * Handle script apply
 * @param {string} scriptText - Script text to apply
 */
async function handleScriptApply(scriptText) {
    if (!currentSessionId) {
        uiControls.updateStatus('No active session');
        return;
    }
    
    if (!scriptText) {
        uiControls.updateStatus('No script to apply');
        return;
    }
    
    // Update UI
    uiControls.updateStatus('Applying script...');
    
    // Send to server
    const result = await apiClient.setScript(scriptText);
    
    if (result.success) {
        // Update transcription display if up-sots were returned
        if (result.up_sots) {
            uiControls.displayTranscription(result.up_sots);
        }
        
        uiControls.updateStatus('Script applied');
    } else {
        uiControls.updateStatus(`Error: ${result.error || 'Failed to apply script'}`);
    }
}

/**
 * Handle generate output
 * @param {Object} formats - Output format selections
 * @param {string} email - Email address
 */
async function handleGenerateOutput(formats, email) {
    if (!currentSessionId) {
        uiControls.updateStatus('No active session');
        return;
    }
    
    // Validate formats
    if (!formats.txt && !formats.pdf && !formats.edl) {
        uiControls.updateStatus('Please select at least one output format');
        return;
    }
    
    // Update UI
    uiControls.updateStatus('Generating output files...');
    
    // Generate outputs
    const result = await apiClient.generateOutput(formats);
    
    if (result.success) {
        uiControls.updateStatus(`Generated ${result.formats.join(', ')} files`);
        
        // Send email if provided
        if (email) {
            uiControls.updateStatus('Sending email...');
            
            const emailResult = await apiClient.sendEmail(email, {
                include_txt: formats.txt,
                include_pdf: formats.pdf
            });
            
            if (emailResult.success) {
                uiControls.updateStatus(`Email sent to ${email}`);
            } else {
                uiControls.updateStatus(`Error sending email: ${emailResult.error || 'Unknown error'}`);
            }
        }
    } else {
        uiControls.updateStatus(`Error: ${result.error || 'Failed to generate output files'}`);
    }
}

/**
 * Handle download output
 * @param {Object} formats - Output format selections
 */
async function handleDownloadOutput(formats) {
    if (!currentSessionId) {
        uiControls.updateStatus('No active session');
        return;
    }
    
    // Validate formats
    if (!formats.txt && !formats.pdf && !formats.edl) {
        uiControls.updateStatus('Please select at least one output format');
        return;
    }
    
    // Update UI
    uiControls.updateStatus('Generating output files...');
    
    // Generate outputs
    const result = await apiClient.generateOutput(formats);
    
    if (result.success) {
        uiControls.updateStatus(`Generated ${result.formats.join(', ')} files`);
        
        // Download each file
        result.formats.forEach(format => {
            const downloadUrl = apiClient.getDownloadUrl(format);
            
            if (downloadUrl) {
                // Create and click download link
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.target = '_blank';
                a.click();
            }
        });
    } else {
        uiControls.updateStatus(`Error: ${result.error || 'Failed to generate output files'}`);
    }
}
