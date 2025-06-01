"""
Parameter Controls Module for the Retro Transcription Web Tool
Handles parameter settings for transcription and up-sot generation
"""

import os
import json
from datetime import datetime

class ParameterControls:
    """
    Handles parameter settings for transcription and up-sot generation
    for the Retro Transcription Web Tool.
    """
    
    def __init__(self):
        """
        Initialize the parameter controls with default values
        """
        # Default parameters
        self.parameters = {
            "up_sots_count": 10,  # Number of up-sots to generate (0-30)
            "sensitivity": 0.5,   # Sensitivity for segmentation (0.0-1.0)
            "sort_by_relevance": False,  # Sort by relevance to script
            "timecode": "00:00:00"  # Current timecode
        }
    
    def get_parameters(self):
        """
        Get the current parameter values
        
        Returns:
            dict: Current parameter values
        """
        return self.parameters.copy()
    
    def set_parameters(self, params):
        """
        Set multiple parameter values at once
        
        Args:
            params (dict): Dictionary of parameter values to set
        
        Returns:
            dict: Updated parameter values
        """
        # Validate and update each parameter
        if "up_sots_count" in params:
            self.set_up_sots_count(params["up_sots_count"])
        
        if "sensitivity" in params:
            self.set_sensitivity(params["sensitivity"])
        
        if "sort_by_relevance" in params:
            self.set_sort_by_relevance(params["sort_by_relevance"])
        
        if "timecode" in params:
            self.update_timecode(params["timecode"])
        
        return self.get_parameters()
    
    def set_up_sots_count(self, count):
        """
        Set the number of up-sots to generate
        
        Args:
            count (int): Number of up-sots (0-30)
        
        Returns:
            int: Updated up-sots count
        """
        # Validate count
        try:
            count_int = int(count)
            # Clamp to valid range
            count_int = max(0, min(30, count_int))
            self.parameters["up_sots_count"] = count_int
            return count_int
        except (ValueError, TypeError):
            # Return current value if invalid
            return self.parameters["up_sots_count"]
    
    def set_sensitivity(self, sensitivity):
        """
        Set the sensitivity for segmentation
        
        Args:
            sensitivity (float): Sensitivity value (0.0-1.0)
        
        Returns:
            float: Updated sensitivity value
        """
        # Validate sensitivity
        try:
            sens_float = float(sensitivity)
            # Clamp to valid range
            sens_float = max(0.0, min(1.0, sens_float))
            self.parameters["sensitivity"] = sens_float
            return sens_float
        except (ValueError, TypeError):
            # Return current value if invalid
            return self.parameters["sensitivity"]
    
    def set_sort_by_relevance(self, sort_by_relevance):
        """
        Set whether to sort by relevance to script
        
        Args:
            sort_by_relevance (bool): Whether to sort by relevance
        
        Returns:
            bool: Updated sort_by_relevance value
        """
        # Convert to boolean
        self.parameters["sort_by_relevance"] = bool(sort_by_relevance)
        return self.parameters["sort_by_relevance"]
    
    def update_timecode(self, timecode):
        """
        Update the current timecode
        
        Args:
            timecode (str): Timecode in HH:MM:SS format
        
        Returns:
            str: Updated timecode
        """
        # Validate timecode format
        if isinstance(timecode, str) and len(timecode) == 8:
            # Simple validation for HH:MM:SS format
            parts = timecode.split(":")
            if len(parts) == 3 and all(part.isdigit() and len(part) == 2 for part in parts):
                self.parameters["timecode"] = timecode
                return timecode
        
        # Return current value if invalid
        return self.parameters["timecode"]
    
    def reset_timecode(self):
        """
        Reset the timecode to 00:00:00
        
        Returns:
            str: Reset timecode
        """
        self.parameters["timecode"] = "00:00:00"
        return self.parameters["timecode"]
    
    def to_json(self):
        """
        Convert parameters to JSON string
        
        Returns:
            str: JSON representation of parameters
        """
        return json.dumps(self.parameters)
    
    def from_json(self, json_str):
        """
        Load parameters from JSON string
        
        Args:
            json_str (str): JSON string of parameters
        
        Returns:
            dict: Updated parameters
        """
        try:
            params = json.loads(json_str)
            return self.set_parameters(params)
        except json.JSONDecodeError:
            return self.get_parameters()
