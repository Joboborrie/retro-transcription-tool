/**
 * ui-library.js - Handles UI for audio library management
 */

class LibraryUI {
    constructor(audioLibrary, apiClient) {
        this.audioLibrary = audioLibrary;
        this.apiClient = apiClient;
        this.currentSessionId = null;
        this.recordings = [];
        
        // Initialize UI elements
        this.initializeUI();
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Create library tab and content if they don't exist
        this.createLibraryTab();
        
        // Add event listeners
        this.addEventListeners();
    }

    /**
     * Create library tab and content
     */
    createLibraryTab() {
        // Check if library tab already exists
        if (document.getElementById('library-tab')) {
            return;
        }

        // Create tab
        const tabsContainer = document.querySelector('.tabs');
        const libraryTab = document.createElement('div');
        libraryTab.id = 'library-tab';
        libraryTab.className = 'tab';
        libraryTab.textContent = 'AUDIO LIBRARY';
        tabsContainer.appendChild(libraryTab);

        // Create content
        const contentContainer = document.querySelector('.tab-content');
        const libraryContent = document.createElement('div');
        libraryContent.id = 'library-content';
        libraryContent.className = 'tab-pane';
        libraryContent.innerHTML = `
            <h2>Audio Library</h2>
            <p>Access your saved recordings for re-transcription or download.</p>
            
            <div class="library-controls">
                <button id="refresh-library" class="btn btn-secondary">REFRESH LIBRARY</button>
            </div>
            
            <div class="recordings-list">
                <table id="recordings-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Duration</th>
                            <th>Title</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="recordings-tbody">
                        <tr>
                            <td colspan="4">No recordings found. Save a recording to see it here.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div id="retranscribe-panel" class="retranscribe-panel" style="display: none;">
                <h3>Re-Transcribe Recording</h3>
                <div class="parameter-controls">
                    <div class="parameter">
                        <label>UP-SOTS COUNT:</label>
                        <input type="range" id="retranscribe-upsots" min="0" max="30" value="10" class="slider">
                        <span id="retranscribe-upsots-value">10</span>
                    </div>
                    <div class="parameter">
                        <label>SENSITIVITY:</label>
                        <input type="range" id="retranscribe-sensitivity" min="0" max="1" step="0.1" value="0.5" class="slider">
                        <span id="retranscribe-sensitivity-value">0.5</span>
                    </div>
                    <div class="parameter">
                        <label>SORT ORDER:</label>
                        <select id="retranscribe-sort">
                            <option value="chronological">Chronological</option>
                            <option value="relevance">Relevance to Script</option>
                        </select>
                    </div>
                </div>
                <div class="retranscribe-actions">
                    <button id="start-retranscribe" class="btn btn-primary">START RE-TRANSCRIPTION</button>
                    <button id="cancel-retranscribe" class="btn btn-secondary">CANCEL</button>
                </div>
            </div>
        `;
        contentContainer.appendChild(libraryContent);

        // Add save recording option to main UI
        this.addSaveRecordingOption();
    }

    /**
     * Add save recording option to main UI
     */
    addSaveRecordingOption() {
        // Check if save option already exists
        if (document.getElementById('save-recording-btn')) {
            return;
        }

        // Find the output options section
        const outputOptions = document.querySelector('.output-options');
        if (!outputOptions) {
            // Create output options if it doesn't exist
            const mainContent = document.querySelector('#main-content');
            const outputOptions = document.createElement('div');
            outputOptions.className = 'output-options';
            outputOptions.innerHTML = '<h3>OUTPUT OPTIONS</h3>';
            mainContent.appendChild(outputOptions);
        }

        // Add save recording button
        const saveBtn = document.createElement('button');
        saveBtn.id = 'save-recording-btn';
        saveBtn.className = 'btn btn-primary';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> SAVE RECORDING';
        saveBtn.disabled = true; // Disabled by default until recording is available
        outputOptions.appendChild(saveBtn);
    }

    /**
     * Add event listeners
     */
    addEventListeners() {
        // Tab switching
        document.getElementById('library-tab').addEventListener('click', () => {
            this.showLibraryTab();
            this.loadRecordings();
        });

        // Refresh library
        document.getElementById('refresh-library').addEventListener('click', () => {
            this.loadRecordings();
        });

        // Save recording
        document.getElementById('save-recording-btn').addEventListener('click', () => {
            this.saveCurrentRecording();
        });

        // Re-transcribe panel controls
        document.getElementById('retranscribe-upsots').addEventListener('input', (e) => {
            document.getElementById('retranscribe-upsots-value').textContent = e.target.value;
        });

        document.getElementById('retranscribe-sensitivity').addEventListener('input', (e) => {
            document.getElementById('retranscribe-sensitivity-value').textContent = e.target.value;
        });

        document.getElementById('cancel-retranscribe').addEventListener('click', () => {
            document.getElementById('retranscribe-panel').style.display = 'none';
        });

        document.getElementById('start-retranscribe').addEventListener('click', () => {
            this.startRetranscription();
        });
    }

    /**
     * Show library tab
     */
    showLibraryTab() {
        // Hide all tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.style.display = 'none';
        });

        // Show library content
        document.getElementById('library-content').style.display = 'block';

        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById('library-tab').classList.add('active');
    }

    /**
     * Load recordings from server
     */
    async loadRecordings() {
        try {
            const result = await this.audioLibrary.getAllRecordings();
            
            if (result.success) {
                this.recordings = result.recordings;
                this.updateRecordingsTable();
            } else {
                this.showError('Failed to load recordings: ' + result.error);
            }
        } catch (error) {
            this.showError('Error loading recordings: ' + error.message);
        }
    }

    /**
     * Update recordings table
     */
    updateRecordingsTable() {
        const tbody = document.getElementById('recordings-tbody');
        
        // Clear table
        tbody.innerHTML = '';
        
        if (this.recordings.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4">No recordings found. Save a recording to see it here.</td>';
            tbody.appendChild(row);
            return;
        }
        
        // Add recordings to table
        this.recordings.forEach(recording => {
            const row = document.createElement('tr');
            
            // Format date
            const date = new Date(recording.date_created);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            // Format duration (if available)
            let duration = 'N/A';
            if (recording.duration_seconds) {
                const minutes = Math.floor(recording.duration_seconds / 60);
                const seconds = Math.floor(recording.duration_seconds % 60);
                duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            
            // Format title
            const title = recording.title || `Recording ${recording.timestamp}`;
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${duration}</td>
                <td>${title}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary retranscribe-btn" data-id="${recording.id}">
                        <i class="fas fa-sync"></i> Re-Transcribe
                    </button>
                    <a href="${this.audioLibrary.getDownloadUrl(recording.id)}" class="btn btn-sm btn-secondary" download>
                        <i class="fas fa-download"></i> Download
                    </a>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${recording.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to buttons
        document.querySelectorAll('.retranscribe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordingId = e.target.closest('button').dataset.id;
                this.showRetranscribePanel(recordingId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordingId = e.target.closest('button').dataset.id;
                this.deleteRecording(recordingId);
            });
        });
    }

    /**
     * Show re-transcribe panel
     * @param {string} recordingId - ID of the recording to re-transcribe
     */
    showRetranscribePanel(recordingId) {
        // Store recording ID
        this.currentRetranscribeId = recordingId;
        
        // Show panel
        document.getElementById('retranscribe-panel').style.display = 'block';
        
        // Scroll to panel
        document.getElementById('retranscribe-panel').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Start re-transcription
     */
    async startRetranscription() {
        if (!this.currentRetranscribeId) {
            return;
        }
        
        try {
            // Get parameters
            const parameters = {
                max_count: parseInt(document.getElementById('retranscribe-upsots').value),
                sensitivity: parseFloat(document.getElementById('retranscribe-sensitivity').value),
                sort_by_relevance: document.getElementById('retranscribe-sort').value === 'relevance'
            };
            
            // If sorting by relevance, get reference script
            if (parameters.sort_by_relevance) {
                const scriptContent = document.querySelector('#script-content textarea').value;
                if (scriptContent) {
                    parameters.reference_script = scriptContent;
                }
            }
            
            // Show loading
            this.showMessage('Re-transcribing recording... This may take a moment.');
            
            // Start re-transcription
            const result = await this.audioLibrary.retranscribe(this.currentRetranscribeId, parameters);
            
            if (result.success) {
                // Hide re-transcribe panel
                document.getElementById('retranscribe-panel').style.display = 'none';
                
                // Update transcription display
                this.updateTranscriptionDisplay(result.transcription, result.up_sots);
                
                // Switch to main tab
                this.showMainTab();
                
                this.showMessage('Re-transcription complete!');
            } else {
                this.showError('Failed to re-transcribe: ' + result.error);
            }
        } catch (error) {
            this.showError('Error during re-transcription: ' + error.message);
        }
    }

    /**
     * Update transcription display
     * @param {Object} transcription - Transcription result
     * @param {Array} upSots - Up-sots
     */
    updateTranscriptionDisplay(transcription, upSots) {
        // Update transcription content
        const transcriptionContent = document.querySelector('#transcription-content');
        
        if (transcription.full_transcript) {
            transcriptionContent.innerHTML = `<h3>Full Transcript</h3><p>${transcription.full_transcript}</p>`;
        }
        
        // Update up-sots
        const upSotsContent = document.querySelector('#upsots-content') || document.createElement('div');
        upSotsContent.id = 'upsots-content';
        
        if (upSots && upSots.length > 0) {
            let upSotsHtml = '<h3>Up-Sots</h3><ul>';
            
            upSots.forEach(upSot => {
                upSotsHtml += `<li><strong>${upSot.timecode}</strong>: ${upSot.text}</li>`;
            });
            
            upSotsHtml += '</ul>';
            upSotsContent.innerHTML = upSotsHtml;
            
            // Add to transcription content if not already there
            if (!document.querySelector('#upsots-content')) {
                transcriptionContent.appendChild(upSotsContent);
            }
        }
    }

    /**
     * Show main tab
     */
    showMainTab() {
        // Hide all tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.style.display = 'none';
        });

        // Show main content
        document.getElementById('main-content').style.display = 'block';

        // Update active tab
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById('main-tab').classList.add('active');
    }

    /**
     * Delete recording
     * @param {string} recordingId - ID of the recording to delete
     */
    async deleteRecording(recordingId) {
        if (!confirm('Are you sure you want to delete this recording? This cannot be undone.')) {
            return;
        }
        
        try {
            const result = await this.audioLibrary.deleteRecording(recordingId);
            
            if (result.success) {
                this.showMessage('Recording deleted successfully.');
                this.loadRecordings();
            } else {
                this.showError('Failed to delete recording: ' + result.error);
            }
        } catch (error) {
            this.showError('Error deleting recording: ' + error.message);
        }
    }

    /**
     * Save current recording
     */
    async saveCurrentRecording() {
        if (!this.apiClient.sessionId) {
            this.showError('No active recording session.');
            return;
        }
        
        try {
            // Get title from user
            const title = prompt('Enter a title for this recording:', `Recording ${new Date().toLocaleString()}`);
            
            if (!title) {
                return; // User cancelled
            }
            
            // Prepare metadata
            const metadata = {
                title,
                date_saved: new Date().toISOString()
            };
            
            // Get transcription info if available
            const transcriptionContent = document.querySelector('#transcription-content');
            if (transcriptionContent && transcriptionContent.textContent.trim()) {
                metadata.has_transcription = true;
            }
            
            // Save recording
            const result = await this.audioLibrary.saveRecording(this.apiClient.sessionId, metadata);
            
            if (result.success) {
                this.showMessage('Recording saved successfully to your library.');
                
                // Update save button state
                document.getElementById('save-recording-btn').textContent = 'RECORDING SAVED';
                document.getElementById('save-recording-btn').disabled = true;
            } else {
                this.showError('Failed to save recording: ' + result.error);
            }
        } catch (error) {
            this.showError('Error saving recording: ' + error.message);
        }
    }

    /**
     * Set current session ID
     * @param {string} sessionId - Current session ID
     */
    setCurrentSessionId(sessionId) {
        this.currentSessionId = sessionId;
        
        // Update save button state
        const saveBtn = document.getElementById('save-recording-btn');
        if (saveBtn) {
            saveBtn.disabled = !sessionId;
            saveBtn.textContent = '<i class="fas fa-save"></i> SAVE RECORDING';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        alert('Error: ' + message);
    }

    /**
     * Show message
     * @param {string} message - Message
     */
    showMessage(message) {
        // Create message element if it doesn't exist
        let messageEl = document.getElementById('status-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'status-message';
            messageEl.className = 'status-message';
            document.body.appendChild(messageEl);
        }
        
        // Show message
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}
