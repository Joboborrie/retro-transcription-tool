/**
 * ui-controls.js - Handles UI interactions and controls
 */

class UIControls {
    constructor() {
        // Tab controls
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        
        // Parameter controls
        this.upSotsSlider = document.getElementById('upSotsCount');
        this.upSotsValue = document.getElementById('upSotsValue');
        this.sensitivitySlider = document.getElementById('sensitivity');
        this.sensitivityValue = document.getElementById('sensitivityValue');
        this.sortByRadios = document.getElementsByName('sortBy');
        this.micSelect = document.getElementById('micSelect');
        
        // Script controls
        this.scriptInput = document.getElementById('scriptInput');
        this.loadScriptBtn = document.getElementById('loadScriptBtn');
        this.saveScriptBtn = document.getElementById('saveScriptBtn');
        this.applyScriptBtn = document.getElementById('applyScriptBtn');
        this.scriptFileInput = document.getElementById('scriptFileInput');
        
        // Output controls
        this.txtFormat = document.getElementById('txtFormat');
        this.pdfFormat = document.getElementById('pdfFormat');
        this.edlFormat = document.getElementById('edlFormat');
        this.emailInput = document.getElementById('emailInput');
        this.generateBtn = document.getElementById('generateBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        // Status message
        this.statusMessage = document.getElementById('statusMessage');
        
        // Transcription results
        this.transcriptionResults = document.getElementById('transcriptionResults');
        
        // Initialize tab functionality
        this.initTabs();
    }
    
    /**
     * Initialize tab functionality
     */
    initTabs() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                
                // Update active tab button
                this.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab pane
                this.tabPanes.forEach(pane => {
                    if (pane.id === tabId) {
                        pane.classList.add('active');
                    } else {
                        pane.classList.remove('active');
                    }
                });
            });
        });
    }
    
    /**
     * Get current parameter values
     * @returns {Object} Parameter values
     */
    getParameters() {
        // Get sort by value
        let sortByRelevance = false;
        this.sortByRadios.forEach(radio => {
            if (radio.checked && radio.value === 'relevance') {
                sortByRelevance = true;
            }
        });
        
        return {
            up_sots_count: parseInt(this.upSotsSlider.value),
            sensitivity: parseFloat(this.sensitivitySlider.value),
            sort_by_relevance: sortByRelevance
        };
    }
    
    /**
     * Get selected microphone device ID
     * @returns {string} Selected device ID
     */
    getSelectedMicrophoneId() {
        const selectedOption = this.micSelect.options[this.micSelect.selectedIndex];
        return selectedOption.value !== 'default' ? selectedOption.value : null;
    }
    
    /**
     * Get script text
     * @returns {string} Script text
     */
    getScriptText() {
        return this.scriptInput.value.trim();
    }
    
    /**
     * Get output format selections
     * @returns {Object} Format selections
     */
    getOutputFormats() {
        return {
            txt: this.txtFormat.checked,
            pdf: this.pdfFormat.checked,
            edl: this.edlFormat.checked
        };
    }
    
    /**
     * Get email address
     * @returns {string} Email address
     */
    getEmailAddress() {
        return this.emailInput.value.trim();
    }
    
    /**
     * Update status message
     * @param {string} message - Status message
     */
    updateStatus(message) {
        this.statusMessage.textContent = message;
    }
    
    /**
     * Display transcription results
     * @param {Array} upSots - Array of up-sot segments
     */
    displayTranscription(upSots) {
        if (!upSots || upSots.length === 0) {
            this.transcriptionResults.innerHTML = '<p class="placeholder-text">No transcription segments available.</p>';
            return;
        }
        
        let html = '';
        
        upSots.forEach(segment => {
            html += `<div class="up-sot">
                <span class="timecode">[${segment.timecode}]</span>
                <span class="text">${segment.text}</span>
            </div>`;
        });
        
        this.transcriptionResults.innerHTML = html;
    }
    
    /**
     * Populate microphone dropdown with available devices
     * @param {Array} devices - Array of media devices
     */
    populateMicrophoneDropdown(devices) {
        // Clear existing options except default
        while (this.micSelect.options.length > 1) {
            this.micSelect.remove(1);
        }
        
        // Add devices to dropdown
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${this.micSelect.options.length}`;
            this.micSelect.appendChild(option);
        });
    }
    
    /**
     * Set up parameter control event listeners
     * @param {Function} callback - Callback function for parameter changes
     */
    setupParameterListeners(callback) {
        // Up-sots count slider
        this.upSotsSlider.addEventListener('input', () => {
            this.upSotsValue.textContent = this.upSotsSlider.value;
            if (callback) callback(this.getParameters());
        });
        
        // Sensitivity slider
        this.sensitivitySlider.addEventListener('input', () => {
            this.sensitivityValue.textContent = this.sensitivitySlider.value;
            if (callback) callback(this.getParameters());
        });
        
        // Sort by radios
        this.sortByRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (callback) callback(this.getParameters());
            });
        });
    }
    
    /**
     * Set up script control event listeners
     * @param {Object} callbacks - Callback functions for script controls
     */
    setupScriptListeners(callbacks) {
        // Load script button
        if (this.loadScriptBtn && callbacks.load) {
            this.loadScriptBtn.addEventListener('click', () => {
                this.scriptFileInput.click();
            });
            
            this.scriptFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.scriptInput.value = e.target.result;
                        callbacks.load(e.target.result);
                    };
                    reader.readAsText(file);
                }
            });
        }
        
        // Save script button
        if (this.saveScriptBtn && callbacks.save) {
            this.saveScriptBtn.addEventListener('click', () => {
                callbacks.save(this.getScriptText());
            });
        }
        
        // Apply script button
        if (this.applyScriptBtn && callbacks.apply) {
            this.applyScriptBtn.addEventListener('click', () => {
                callbacks.apply(this.getScriptText());
            });
        }
    }
    
    /**
     * Set up output control event listeners
     * @param {Object} callbacks - Callback functions for output controls
     */
    setupOutputListeners(callbacks) {
        // Generate button
        if (this.generateBtn && callbacks.generate) {
            this.generateBtn.addEventListener('click', () => {
                callbacks.generate(this.getOutputFormats(), this.getEmailAddress());
            });
        }
        
        // Download button
        if (this.downloadBtn && callbacks.download) {
            this.downloadBtn.addEventListener('click', () => {
                callbacks.download(this.getOutputFormats());
            });
        }
    }
}
