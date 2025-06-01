"""
Script Matcher Module for the Retro Transcription Web Tool
Handles script input and matching with transcribed content
"""

import os
import re
import json
import difflib
from datetime import datetime
import tempfile

class ScriptMatcher:
    """
    Handles script input and matching with transcribed content
    for the Retro Transcription Web Tool.
    """
    
    def __init__(self, scripts_folder=None):
        """
        Initialize the script matcher
        
        Args:
            scripts_folder (str, optional): Folder to store script files
        """
        # Set scripts folder
        if scripts_folder:
            self.scripts_folder = scripts_folder
        else:
            self.scripts_folder = os.path.join(tempfile.gettempdir(), 'retro_transcription_scripts')
        
        # Create scripts folder if it doesn't exist
        if not os.path.exists(self.scripts_folder):
            os.makedirs(self.scripts_folder)
        
        self.reference_script = ""
        self.script_sentences = []
        self.script_keywords = set()
        
        # Try to import nltk for better text processing
        try:
            import nltk
            from nltk.tokenize import sent_tokenize, word_tokenize
            from nltk.corpus import stopwords
            
            # Download NLTK resources if needed
            try:
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                nltk.download('punkt')
            
            try:
                nltk.data.find('corpora/stopwords')
            except LookupError:
                nltk.download('stopwords')
                
            self.nltk_available = True
            self.stopwords = set(stopwords.words('english'))
            self.tokenize_sentences = sent_tokenize
            self.tokenize_words = word_tokenize
            
        except ImportError:
            # Fallback to basic processing if nltk is not available
            self.nltk_available = False
            self.stopwords = set(['a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 
                                 'as', 'what', 'when', 'where', 'how', 'why', 'which', 
                                 'who', 'whom', 'this', 'that', 'these', 'those', 'is', 
                                 'are', 'was', 'were', 'be', 'been', 'being', 'have', 
                                 'has', 'had', 'do', 'does', 'did', 'to', 'at', 'by', 
                                 'for', 'with', 'about', 'against', 'between', 'into', 
                                 'through', 'during', 'before', 'after', 'above', 'below', 
                                 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 
                                 'under', 'again', 'further', 'then', 'once', 'here', 
                                 'there', 'all', 'any', 'both', 'each', 'few', 'more', 
                                 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 
                                 'only', 'own', 'same', 'so', 'than', 'too', 'very', 
                                 'can', 'will', 'just', 'should', 'now'])
            
            # Simple sentence tokenizer
            self.tokenize_sentences = lambda text: re.split(r'(?<=[.!?])\s+', text)
            
            # Simple word tokenizer
            self.tokenize_words = lambda text: re.findall(r'\b\w+\b', text.lower())
    
    def set_reference_script(self, script_text):
        """
        Set the reference script and process it for matching
        
        Args:
            script_text (str): The reference script text
        
        Returns:
            dict: Result with success status
        """
        try:
            self.reference_script = script_text
            
            # Tokenize script into sentences
            self.script_sentences = self.tokenize_sentences(script_text)
            
            # Extract keywords (excluding common stopwords)
            words = self.tokenize_words(script_text.lower())
            self.script_keywords = {word for word in words 
                                   if word.isalnum() and word not in self.stopwords}
            
            # Save script to file
            self._save_script()
            
            return {
                "success": True,
                "sentence_count": len(self.script_sentences),
                "keyword_count": len(self.script_keywords)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def match_transcript_segment(self, segment_text):
        """
        Match a transcript segment against the reference script
        
        Args:
            segment_text (str): Text of the transcript segment
        
        Returns:
            dict: Matching results including relevance score and matched sentences
        """
        if not self.reference_script or not segment_text:
            return {"relevance_score": 0, "matched_sentences": []}
        
        # Extract segment keywords
        segment_words = self.tokenize_words(segment_text.lower())
        segment_keywords = {word for word in segment_words 
                           if word.isalnum() and word not in self.stopwords}
        
        # Calculate keyword overlap (Jaccard similarity)
        if self.script_keywords and segment_keywords:
            intersection = self.script_keywords.intersection(segment_keywords)
            union = self.script_keywords.union(segment_keywords)
            keyword_score = len(intersection) / len(union)
        else:
            keyword_score = 0
        
        # Find best matching sentences in script
        matched_sentences = []
        sentence_scores = []
        
        for script_sentence in self.script_sentences:
            similarity = difflib.SequenceMatcher(None, 
                                               segment_text.lower(), 
                                               script_sentence.lower()).ratio()
            if similarity > 0.3:  # Threshold for considering a match
                matched_sentences.append({
                    "text": script_sentence,
                    "similarity": similarity
                })
                sentence_scores.append(similarity)
        
        # Sort matched sentences by similarity
        matched_sentences.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Limit to top 3 matches
        matched_sentences = matched_sentences[:3]
        
        # Calculate overall relevance score (combination of keyword and sentence matching)
        if sentence_scores:
            # Weight: 60% keyword overlap, 40% best sentence match
            relevance_score = (0.6 * keyword_score) + (0.4 * max(sentence_scores))
        else:
            relevance_score = keyword_score * 0.6
        
        return {
            "relevance_score": relevance_score,
            "matched_sentences": matched_sentences
        }
    
    def score_transcript_segments(self, segments):
        """
        Score multiple transcript segments against the reference script
        
        Args:
            segments (list): List of transcript segments
        
        Returns:
            list: Segments with added relevance scores
        """
        scored_segments = []
        
        for segment in segments:
            match_result = self.match_transcript_segment(segment["text"])
            
            # Add relevance score to segment
            segment_copy = segment.copy()
            segment_copy["relevance_score"] = match_result["relevance_score"]
            segment_copy["matched_sentences"] = match_result["matched_sentences"]
            
            scored_segments.append(segment_copy)
        
        return scored_segments
    
    def sort_segments_by_relevance(self, segments):
        """
        Sort transcript segments by relevance to the reference script
        
        Args:
            segments (list): List of transcript segments
        
        Returns:
            list: Segments sorted by relevance score
        """
        # Score segments if they don't already have relevance scores
        if segments and "relevance_score" not in segments[0]:
            segments = self.score_transcript_segments(segments)
        
        # Sort by relevance score
        sorted_segments = sorted(segments, key=lambda x: x["relevance_score"], reverse=True)
        
        return sorted_segments
    
    def _save_script(self):
        """
        Save the current reference script to a file
        
        Returns:
            str: Path to the saved script file
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"script_{timestamp}.txt"
        file_path = os.path.join(self.scripts_folder, filename)
        
        with open(file_path, 'w') as f:
            f.write(self.reference_script)
        
        return file_path
    
    def load_script(self, file_path):
        """
        Load a reference script from a file
        
        Args:
            file_path (str): Path to the script file
        
        Returns:
            dict: Result with success status and script text
        """
        try:
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    script_text = f.read()
                
                result = self.set_reference_script(script_text)
                if result["success"]:
                    result["script_text"] = script_text
                
                return result
            
            return {
                "success": False,
                "error": "File not found"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
