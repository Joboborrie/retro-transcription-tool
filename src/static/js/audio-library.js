/**
 * audio-library.js - Handles audio library management
 */

class AudioLibrary {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Save a recording permanently
     * @param {string} sessionId - Session ID of the recording
     * @param {Object} metadata - Additional metadata about the recording
     * @returns {Promise} Promise resolving to API response
     */
    async saveRecording(sessionId, metadata = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/audio-library/save-recording`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    metadata
                })
            });

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
            console.error('Error saving recording:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all saved recordings
     * @returns {Promise} Promise resolving to API response
     */
    async getAllRecordings() {
        try {
            const response = await fetch(`${this.baseUrl}/api/audio-library/get-all-recordings`);
            
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
            console.error('Error getting recordings:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a recording by ID
     * @param {string} recordingId - ID of the recording
     * @returns {Promise} Promise resolving to API response
     */
    async getRecording(recordingId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/audio-library/get-recording/${recordingId}`);
            
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
            console.error('Error getting recording:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a recording
     * @param {string} recordingId - ID of the recording
     * @returns {Promise} Promise resolving to API response
     */
    async deleteRecording(recordingId) {
        try {
            const response = await fetch(`${this.baseUrl}/api/audio-library/delete-recording/${recordingId}`, {
                method: 'DELETE'
            });
            
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
            console.error('Error deleting recording:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get download URL for a recording
     * @param {string} recordingId - ID of the recording
     * @returns {string} Download URL
     */
    getDownloadUrl(recordingId) {
        return `${this.baseUrl}/api/audio-library/download-recording/${recordingId}`;
    }

    /**
     * Re-transcribe a saved recording
     * @param {string} recordingId - ID of the recording
     * @param {Object} parameters - Transcription parameters
     * @returns {Promise} Promise resolving to API response
     */
    async retranscribe(recordingId, parameters = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/api/audio-library/retranscribe/${recordingId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parameters
                })
            });
            
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
            console.error('Error re-transcribing recording:', error);
            return { success: false, error: error.message };
        }
    }
}
