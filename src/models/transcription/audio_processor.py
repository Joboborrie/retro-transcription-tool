"""
Audio Processor Module for the Retro Transcription Web Tool
Handles audio processing and transcription
"""

import os
import json
import time
import tempfile
from datetime import datetime
import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence, detect_nonsilent
import numpy as np

class AudioProcessor:
    """
    Handles audio processing and transcription for the web application
    """
    
    def __init__(self, upload_folder=None):
        """
        Initialize the audio processor
        
        Args:
            upload_folder (str, optional): Folder to store uploaded audio files
        """
        self.recognizer = sr.Recognizer()
        
        # Set upload folder
        if upload_folder:
            self.upload_folder = upload_folder
        else:
            self.upload_folder = os.path.join(tempfile.gettempdir(), 'retro_transcription_uploads')
        
        # Create upload folder if it doesn't exist
        if not os.path.exists(self.upload_folder):
            os.makedirs(self.upload_folder)
    
    def save_audio_file(self, audio_data, filename=None):
        """
        Save audio data to a file
        
        Args:
            audio_data: Audio data (bytes)
            filename (str, optional): Filename to save as
        
        Returns:
            str: Path to the saved audio file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"recording_{timestamp}.wav"
        
        file_path = os.path.join(self.upload_folder, filename)
        
        with open(file_path, 'wb') as f:
            f.write(audio_data)
        
        return file_path
    
    def transcribe_audio(self, audio_file):
        """
        Transcribe the audio file to text
        
        Args:
            audio_file (str): Path to the audio file
        
        Returns:
            dict: Transcription results with segments and timecodes
        """
        try:
            # Load audio file
            audio = AudioSegment.from_file(audio_file)
            
            # Detect non-silent chunks
            min_silence_len = 500  # ms
            silence_thresh = -40  # dB
            
            # Get non-silent ranges
            non_silent_ranges = detect_nonsilent(
                audio, 
                min_silence_len=min_silence_len, 
                silence_thresh=silence_thresh
            )
            
            # Process each chunk
            transcript_segments = []
            
            for i, (start_ms, end_ms) in enumerate(non_silent_ranges):
                # Extract chunk
                chunk = audio[start_ms:end_ms]
                
                # Convert to proper format for recognition
                chunk_file = os.path.join(self.upload_folder, f"temp_chunk_{i}.wav")
                chunk.export(chunk_file, format="wav")
                
                # Transcribe chunk
                with sr.AudioFile(chunk_file) as source:
                    audio_data = self.recognizer.record(source)
                    try:
                        text = self.recognizer.recognize_google(audio_data)
                        if text:
                            # Calculate timecode
                            start_time = start_ms / 1000  # Convert to seconds
                            hours = int(start_time // 3600)
                            minutes = int((start_time % 3600) // 60)
                            seconds = int(start_time % 60)
                            timecode = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                            
                            transcript_segments.append({
                                "timecode": timecode,
                                "text": text,
                                "start_ms": start_ms,
                                "end_ms": end_ms,
                                "duration_ms": end_ms - start_ms
                            })
                    except sr.UnknownValueError:
                        pass  # Skip segments that couldn't be transcribed
                    except sr.RequestError as e:
                        print(f"API error: {e}")
                
                # Clean up temp file
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
            
            # Return results
            return {
                "success": True,
                "segments": transcript_segments,
                "full_transcript": " ".join([segment["text"] for segment in transcript_segments])
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_up_sots(self, segments, max_count=10, sensitivity=0.5, sort_by_relevance=False, reference_script=None):
        """
        Get the most important segments as 'up-sots'
        
        Args:
            segments (list): List of transcript segments
            max_count (int): Maximum number of up-sots to return (0-30)
            sensitivity (float): Sensitivity for determining segment boundaries (0.0-1.0)
            sort_by_relevance (bool): Whether to sort by relevance to reference script
            reference_script (str, optional): Reference script for relevance scoring
        
        Returns:
            list: List of up-sot segments with timecodes
        """
        if not segments:
            return []
        
        # Adjust segment selection based on sensitivity
        # Higher sensitivity means more segments (lower threshold for inclusion)
        min_duration_ms = 1000 * (1.0 - sensitivity)  # 0-1000ms based on sensitivity
        filtered_segments = [s for s in segments if s["duration_ms"] >= min_duration_ms]
        
        # If we have a reference script and sort_by_relevance is True,
        # score segments based on relevance to the script
        if reference_script and sort_by_relevance:
            import re
            
            # Simple word-based relevance scoring
            script_words = set(re.findall(r'\b\w+\b', reference_script.lower()))
            
            for segment in filtered_segments:
                segment_words = set(re.findall(r'\b\w+\b', segment["text"].lower()))
                
                # Calculate Jaccard similarity
                if script_words and segment_words:
                    intersection = script_words.intersection(segment_words)
                    union = script_words.union(segment_words)
                    segment["relevance_score"] = len(intersection) / len(union)
                else:
                    segment["relevance_score"] = 0
            
            # Sort by relevance score
            filtered_segments.sort(key=lambda x: x["relevance_score"], reverse=True)
        else:
            # Sort by timestamp (chronological)
            filtered_segments.sort(key=lambda x: x["start_ms"])
        
        # Limit to max_count
        if max_count > 0:
            filtered_segments = filtered_segments[:max_count]
        
        return filtered_segments
