/**
 * api-client.js - Handles API communication with the backend
 */

class ApiClient {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
        this.sessionId = null;
    }

    /**
     * Upload audio file to the server
     * @param {Blob} audioBlob - Audio blob to upload
     * @returns {Promise} Promise resolving to API response
     */
    async uploadAudio(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');

            const response = await fetch(`${this.baseUrl}/api/transcription/upload-audio`, {
                method: 'POST',
                body: formData
            });

            // Improved error handling for JSON parsing
            try {
                const data = await response.json();
                
                if (data.success) {
                    this.sessionId = data.session_id;
                }
                
                return data;
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error uploading audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Upload audio data from browser recording
     * @param {Blob} audioBlob - Audio blob from recorder
     * @returns {Promise} Promise resolving to API response
     */
    async recordAudio(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('audio_data', audioBlob, 'recording.wav');

            const response = await fetch(`${this.baseUrl}/api/transcription/record-audio`, {
                method: 'POST',
                body: formData
            });

            // Improved error handling for JSON parsing
            try {
                const data = await response.json();
                
                if (data.success) {
                    this.sessionId = data.session_id;
                }
                
                return data;
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error recording audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Transcribe audio for current session
     * @param {Object} parameters - Optional parameters for transcription
     * @returns {Promise} Promise resolving to API response
     */
    async transcribeAudio(parameters = null) {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (parameters) {
                options.body = JSON.stringify({ parameters });
            }

            const response = await fetch(`${this.baseUrl}/api/transcription/transcribe/${this.sessionId}`, options);
            
            // Improved error handling for JSON parsing
            try {
                return await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set parameters for current session
     * @param {Object} parameters - Parameters to set
     * @returns {Promise} Promise resolving to API response
     */
    async setParameters(parameters) {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/transcription/set-parameters/${this.sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(parameters)
            });

            // Improved error handling for JSON parsing
            try {
                return await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error setting parameters:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Set reference script for current session
     * @param {string} script - Script text
     * @returns {Promise} Promise resolving to API response
     */
    async setScript(script) {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/transcription/set-script/${this.sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ script })
            });

            // Improved error handling for JSON parsing
            try {
                return await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error setting script:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate output files for current session
     * @param {Object} formats - Format selections (txt, pdf, edl)
     * @returns {Promise} Promise resolving to API response
     */
    async generateOutput(formats = { txt: true, pdf: true, edl: true }) {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/transcription/generate-output/${this.sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ formats })
            });

            // Improved error handling for JSON parsing
            try {
                return await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error generating output:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send output files via email
     * @param {string} email - Recipient email address
     * @param {Object} options - Additional options
     * @returns {Promise} Promise resolving to API response
     */
    async sendEmail(email, options = {}) {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const payload = {
                email,
                ...options
            };

            const response = await fetch(`${this.baseUrl}/api/transcription/send-email/${this.sessionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            // Improved error handling for JSON parsing
            try {
                return await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get information about current session
     * @returns {Promise} Promise resolving to API response
     */
    async getSessionInfo() {
        if (!this.sessionId) {
            return { success: false, error: 'No active session' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/transcription/session-info/${this.sessionId}`);
            
            // Improved error handling for JSON parsing
            try {
                return await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    success: false, 
                    error: 'Invalid server response format. Please try again.' 
                };
            }
        } catch (error) {
            console.error('Error getting session info:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get download URL for output file
     * @param {string} format - File format (txt, pdf, edl)
     * @returns {string} Download URL
     */
    getDownloadUrl(format) {
        if (!this.sessionId) {
            return null;
        }

        return `${this.baseUrl}/api/transcription/download/${this.sessionId}/${format}`;
    }

    /**
     * Clear current session
     */
    clearSession() {
        this.sessionId = null;
    }
}
