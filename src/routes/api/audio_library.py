"""
Routes for audio library management
"""

from flask import Blueprint, request, jsonify, send_file
import os
import json
from src.models.transcription.audio_storage import AudioStorage
from src.models.transcription.audio_processor import AudioProcessor

# Create blueprint
audio_library_bp = Blueprint('audio_library', __name__, url_prefix='/api/audio-library')

# Initialize audio storage
audio_storage = AudioStorage()
audio_processor = AudioProcessor()

@audio_library_bp.route('/save-recording', methods=['POST'])
def save_recording():
    """
    Save a recording permanently
    """
    try:
        # Get session ID from request
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'No session ID provided'
            }), 400
        
        # Get metadata from request
        metadata = data.get('metadata', {})
        
        # Get temporary file path from session
        temp_file_path = os.path.join(audio_processor.upload_folder, f"{session_id}.wav")
        
        if not os.path.exists(temp_file_path):
            return jsonify({
                'success': False,
                'error': 'Recording not found'
            }), 404
        
        # Save recording permanently
        result = audio_storage.save_recording(temp_file_path, metadata)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audio_library_bp.route('/get-recording/<recording_id>', methods=['GET'])
def get_recording(recording_id):
    """
    Get a recording by ID
    """
    try:
        result = audio_storage.get_recording(recording_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audio_library_bp.route('/get-all-recordings', methods=['GET'])
def get_all_recordings():
    """
    Get all saved recordings
    """
    try:
        result = audio_storage.get_all_recordings()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audio_library_bp.route('/delete-recording/<recording_id>', methods=['DELETE'])
def delete_recording(recording_id):
    """
    Delete a recording
    """
    try:
        result = audio_storage.delete_recording(recording_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audio_library_bp.route('/download-recording/<recording_id>', methods=['GET'])
def download_recording(recording_id):
    """
    Download a recording
    """
    try:
        result = audio_storage.get_recording(recording_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        recording = result['recording']
        file_path = recording['path']
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Recording file not found'
            }), 404
        
        return send_file(file_path, as_attachment=True, download_name=recording['filename'])
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audio_library_bp.route('/retranscribe/<recording_id>', methods=['POST'])
def retranscribe(recording_id):
    """
    Re-transcribe a saved recording
    """
    try:
        # Get recording
        result = audio_storage.get_recording(recording_id)
        
        if not result['success']:
            return jsonify(result), 404
        
        recording = result['recording']
        file_path = recording['path']
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'Recording file not found'
            }), 404
        
        # Get transcription parameters
        data = request.get_json()
        parameters = data.get('parameters', {})
        
        # Transcribe audio
        transcription_result = audio_processor.transcribe_audio(file_path)
        
        if not transcription_result['success']:
            return jsonify(transcription_result), 500
        
        # Process up-sots based on parameters
        max_count = parameters.get('max_count', 10)
        sensitivity = parameters.get('sensitivity', 0.5)
        sort_by_relevance = parameters.get('sort_by_relevance', False)
        reference_script = parameters.get('reference_script', None)
        
        segments = transcription_result['segments']
        up_sots = audio_processor.get_up_sots(
            segments, 
            max_count=max_count, 
            sensitivity=sensitivity,
            sort_by_relevance=sort_by_relevance,
            reference_script=reference_script
        )
        
        return jsonify({
            'success': True,
            'transcription': transcription_result,
            'up_sots': up_sots
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
