"""
Output Generator Module for the Retro Transcription Web Tool
Handles generation of TXT, PDF, and EDL output files
"""

import os
import json
import time
import re
from datetime import datetime
from fpdf import FPDF
import tempfile

class OutputGenerator:
    """
    Handles generation of TXT, PDF, and EDL output files
    for the Retro Transcription Web Tool.
    """
    
    def __init__(self, output_folder=None):
        """
        Initialize the output generator
        
        Args:
            output_folder (str, optional): Folder to store output files
        """
        # Set output folder
        if output_folder:
            self.output_folder = output_folder
        else:
            self.output_folder = os.path.join(tempfile.gettempdir(), 'retro_transcription_outputs')
        
        # Create output folder if it doesn't exist
        if not os.path.exists(self.output_folder):
            os.makedirs(self.output_folder)
    
    def generate_txt_output(self, segments, filename=None):
        """
        Generate a TXT file from transcript segments
        
        Args:
            segments (list): List of transcript segments
            filename (str, optional): Output filename (without extension)
        
        Returns:
            dict: Result with file path and success status
        """
        try:
            # Generate default filename if not provided
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"transcript_{timestamp}"
            
            output_path = os.path.join(self.output_folder, f"{filename}.txt")
            
            with open(output_path, 'w') as f:
                f.write("TRANSCRIPT WITH TIMECODES\n")
                f.write("=======================\n\n")
                
                for segment in segments:
                    f.write(f"[{segment['timecode']}] {segment['text']}\n\n")
            
            return {
                "success": True,
                "file_path": output_path,
                "filename": os.path.basename(output_path)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_pdf_output(self, segments, filename=None, include_metadata=True):
        """
        Generate a PDF file from transcript segments
        
        Args:
            segments (list): List of transcript segments
            filename (str, optional): Output filename (without extension)
            include_metadata (bool): Whether to include metadata in the PDF
        
        Returns:
            dict: Result with file path and success status
        """
        try:
            # Generate default filename if not provided
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"transcript_{timestamp}"
            
            output_path = os.path.join(self.output_folder, f"{filename}.pdf")
            
            # Create PDF
            pdf = FPDF()
            pdf.add_page()
            
            # Set up fonts
            pdf.set_font("Arial", 'B', 16)
            
            # Add title
            pdf.cell(0, 10, "TRANSCRIPT WITH TIMECODES", ln=True, align='C')
            pdf.ln(5)
            
            # Add metadata if requested
            if include_metadata:
                pdf.set_font("Arial", 'I', 10)
                pdf.cell(0, 10, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
                pdf.cell(0, 10, f"Total Segments: {len(segments)}", ln=True)
                pdf.ln(5)
            
            # Add segments
            pdf.set_font("Arial", size=12)
            
            for segment in segments:
                # Timecode in bold
                pdf.set_font("Arial", 'B', 12)
                pdf.cell(0, 10, f"[{segment['timecode']}]", ln=True)
                
                # Segment text
                pdf.set_font("Arial", size=12)
                
                # Handle long text with multi_cell
                pdf.multi_cell(0, 10, segment['text'])
                pdf.ln(5)
            
            # Save PDF
            pdf.output(output_path)
            
            return {
                "success": True,
                "file_path": output_path,
                "filename": os.path.basename(output_path)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_edl_output(self, segments, source_file, filename=None):
        """
        Generate an EDL file for Premiere Pro from transcript segments
        
        Args:
            segments (list): List of transcript segments
            source_file (str): Path or name of the source audio/video file
            filename (str, optional): Output filename (without extension)
        
        Returns:
            dict: Result with file path and success status
        """
        try:
            # Generate default filename if not provided
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"edl_{timestamp}"
            
            output_path = os.path.join(self.output_folder, f"{filename}.edl")
            
            with open(output_path, 'w') as f:
                # EDL header
                f.write("TITLE: Auto-generated EDL from Retro Transcription Tool\n")
                f.write("FCM: NON-DROP FRAME\n\n")
                
                for i, segment in enumerate(segments):
                    # Convert timecode to EDL format (HH:MM:SS:FF)
                    # Extract hours, minutes, seconds from timecode
                    tc_parts = segment['timecode'].split(':')
                    hours = int(tc_parts[0])
                    minutes = int(tc_parts[1])
                    seconds = int(tc_parts[2])
                    
                    # Calculate duration in seconds
                    duration_sec = segment['duration_ms'] / 1000 if 'duration_ms' in segment else 5.0
                    
                    # Calculate end time
                    end_seconds = seconds + duration_sec
                    end_minutes = minutes
                    end_hours = hours
                    
                    if end_seconds >= 60:
                        end_minutes += int(end_seconds / 60)
                        end_seconds %= 60
                    
                    if end_minutes >= 60:
                        end_hours += int(end_minutes / 60)
                        end_minutes %= 60
                    
                    # Convert to frames (assuming 30fps)
                    start_frames = 0
                    end_frames = int((end_seconds % 1) * 30)
                    
                    # Format for EDL
                    start_tc = f"{hours:02d}:{minutes:02d}:{int(seconds):02d}:{start_frames:02d}"
                    end_tc = f"{end_hours:02d}:{end_minutes:02d}:{int(end_seconds):02d}:{end_frames:02d}"
                    
                    # Write EDL entry
                    f.write(f"{i+1:03d}  AV  C        {start_tc} {end_tc} {start_tc} {end_tc}\n")
                    f.write(f"* FROM CLIP NAME: {os.path.basename(source_file)}\n")
                    
                    # Truncate text if too long
                    comment_text = segment['text']
                    if len(comment_text) > 50:
                        comment_text = comment_text[:47] + "..."
                    
                    f.write(f"* COMMENT: {comment_text}\n\n")
            
            return {
                "success": True,
                "file_path": output_path,
                "filename": os.path.basename(output_path)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_all_outputs(self, segments, source_file, formats=None, base_filename=None):
        """
        Generate all selected output formats
        
        Args:
            segments (list): List of transcript segments
            source_file (str): Path or name of the source audio/video file
            formats (dict, optional): Dictionary of format selections (txt, pdf, edl)
            base_filename (str, optional): Base filename for all outputs
        
        Returns:
            dict: Dictionary of generated file paths and success status
        """
        # Default formats if not specified
        if formats is None:
            formats = {"txt": True, "pdf": True, "edl": True}
        
        # Generate base filename if not provided
        if not base_filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_filename = f"transcript_{timestamp}"
        
        # Initialize results
        results = {
            "success": True,
            "files": {}
        }
        
        # Generate each selected format
        if formats.get("txt", True):
            txt_result = self.generate_txt_output(segments, base_filename)
            if txt_result["success"]:
                results["files"]["txt"] = {
                    "path": txt_result["file_path"],
                    "filename": txt_result["filename"]
                }
            else:
                results["success"] = False
                results["txt_error"] = txt_result["error"]
        
        if formats.get("pdf", True):
            pdf_result = self.generate_pdf_output(segments, base_filename)
            if pdf_result["success"]:
                results["files"]["pdf"] = {
                    "path": pdf_result["file_path"],
                    "filename": pdf_result["filename"]
                }
            else:
                results["success"] = False
                results["pdf_error"] = pdf_result["error"]
        
        if formats.get("edl", True):
            edl_result = self.generate_edl_output(segments, source_file, base_filename)
            if edl_result["success"]:
                results["files"]["edl"] = {
                    "path": edl_result["file_path"],
                    "filename": edl_result["filename"]
                }
            else:
                results["success"] = False
                results["edl_error"] = edl_result["error"]
        
        return results
