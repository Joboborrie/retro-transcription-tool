"""
Audio Storage Module for the Retro Transcription Web Tool
Handles permanent storage and retrieval of audio recordings
"""

import os
import json
import shutil
import datetime
from pathlib import Path
import uuid

class AudioStorage:
    """
    Handles permanent storage and retrieval of audio recordings
    """
    
    def __init__(self, storage_folder=None):
        """
        Initialize the audio storage manager
        
        Args:
            storage_folder (str, optional): Folder to store permanent audio files
        """
        # Set storage folder
        if storage_folder:
            self.storage_folder = storage_folder
        else:
            self.storage_folder = os.path.join(os.path.expanduser('~'), 'retro_transcription_storage')
        
        # Create storage folder if it doesn't exist
        if not os.path.exists(self.storage_folder):
            os.makedirs(self.storage_folder)
            
        # Create metadata file if it doesn't exist
        self.metadata_file = os.path.join(self.storage_folder, 'recordings_metadata.json')
        if not os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'w') as f:
                json.dump([], f)
    
    def save_recording(self, temp_file_path, metadata=None):
        """
        Save a recording permanently
        
        Args:
            temp_file_path (str): Path to the temporary audio file
            metadata (dict, optional): Additional metadata about the recording
        
        Returns:
            dict: Information about the saved recording
        """
        try:
            # Generate a unique ID for the recording
            recording_id = str(uuid.uuid4())
            
            # Create timestamp
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Get file extension
            _, ext = os.path.splitext(temp_file_path)
            if not ext:
                ext = '.wav'  # Default to .wav if no extension
            
            # Create filename
            filename = f"recording_{timestamp}_{recording_id}{ext}"
            
            # Create destination path
            dest_path = os.path.join(self.storage_folder, filename)
            
            # Copy the file
            shutil.copy2(temp_file_path, dest_path)
            
            # Prepare recording info
            recording_info = {
                'id': recording_id,
                'filename': filename,
                'path': dest_path,
                'timestamp': timestamp,
                'date_created': datetime.datetime.now().isoformat(),
                'size_bytes': os.path.getsize(dest_path)
            }
            
            # Add additional metadata if provided
            if metadata:
                recording_info.update(metadata)
            
            # Update metadata file
            self._update_metadata(recording_info)
            
            return {
                'success': True,
                'recording_id': recording_id,
                'path': dest_path,
                'info': recording_info
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_recording(self, recording_id):
        """
        Get a recording by ID
        
        Args:
            recording_id (str): ID of the recording to retrieve
        
        Returns:
            dict: Information about the recording
        """
        try:
            # Get all recordings
            recordings = self._get_all_metadata()
            
            # Find the recording with the given ID
            for recording in recordings:
                if recording.get('id') == recording_id:
                    # Check if file exists
                    if os.path.exists(recording.get('path')):
                        return {
                            'success': True,
                            'recording': recording
                        }
                    else:
                        return {
                            'success': False,
                            'error': 'Recording file not found'
                        }
            
            return {
                'success': False,
                'error': 'Recording not found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_all_recordings(self):
        """
        Get all saved recordings
        
        Returns:
            dict: List of all recordings
        """
        try:
            recordings = self._get_all_metadata()
            
            # Filter out recordings whose files no longer exist
            valid_recordings = []
            for recording in recordings:
                if os.path.exists(recording.get('path')):
                    valid_recordings.append(recording)
            
            return {
                'success': True,
                'recordings': valid_recordings
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_recording(self, recording_id):
        """
        Delete a recording
        
        Args:
            recording_id (str): ID of the recording to delete
        
        Returns:
            dict: Result of the deletion
        """
        try:
            # Get all recordings
            recordings = self._get_all_metadata()
            
            # Find the recording with the given ID
            for i, recording in enumerate(recordings):
                if recording.get('id') == recording_id:
                    # Delete the file
                    if os.path.exists(recording.get('path')):
                        os.remove(recording.get('path'))
                    
                    # Remove from metadata
                    recordings.pop(i)
                    
                    # Update metadata file
                    with open(self.metadata_file, 'w') as f:
                        json.dump(recordings, f)
                    
                    return {
                        'success': True
                    }
            
            return {
                'success': False,
                'error': 'Recording not found'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _update_metadata(self, recording_info):
        """
        Update metadata file with new recording info
        
        Args:
            recording_info (dict): Information about the recording
        """
        # Get current metadata
        recordings = self._get_all_metadata()
        
        # Add new recording info
        recordings.append(recording_info)
        
        # Write updated metadata
        with open(self.metadata_file, 'w') as f:
            json.dump(recordings, f)
    
    def _get_all_metadata(self):
        """
        Get all metadata from the metadata file
        
        Returns:
            list: List of recording metadata
        """
        try:
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            # If file doesn't exist or is invalid, return empty list
            return []
