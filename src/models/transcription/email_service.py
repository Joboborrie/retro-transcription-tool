"""
Email Service Module for the Retro Transcription Web Tool
Handles sending EDL files via email
"""

import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime
import json
import logging

class EmailService:
    """
    Handles sending EDL files via email
    for the Retro Transcription Web Tool.
    """
    
    def __init__(self, config=None):
        """
        Initialize the email service
        
        Args:
            config (dict, optional): Email configuration
        """
        # Default configuration
        self.config = {
            "smtp_server": os.environ.get("SMTP_SERVER", "smtp.example.com"),
            "smtp_port": int(os.environ.get("SMTP_PORT", 587)),
            "use_tls": os.environ.get("SMTP_USE_TLS", "True").lower() == "true",
            "sender_email": os.environ.get("SMTP_SENDER_EMAIL", "retrotranscription@example.com"),
            "sender_name": os.environ.get("SMTP_SENDER_NAME", "Retro Transcription Tool"),
            "username": os.environ.get("SMTP_USERNAME", ""),
            "password": os.environ.get("SMTP_PASSWORD", ""),
            "default_subject": "EDL File from Retro Transcription Tool",
            "default_body": "Please find attached the EDL file generated from your recording."
        }
        
        # Update configuration if provided
        if config:
            self.config.update(config)
        
        # Set up logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger("EmailService")
    
    def send_edl(self, recipient_email, edl_file_path, subject=None, body=None, 
                cc=None, bcc=None, additional_attachments=None):
        """
        Send EDL file via email
        
        Args:
            recipient_email (str): Recipient email address
            edl_file_path (str): Path to the EDL file
            subject (str, optional): Email subject
            body (str, optional): Email body text
            cc (list, optional): List of CC recipients
            bcc (list, optional): List of BCC recipients
            additional_attachments (list, optional): List of additional file paths to attach
        
        Returns:
            dict: Result of the email sending operation
        """
        # Use default subject and body if not provided
        if not subject:
            subject = self.config["default_subject"]
        
        if not body:
            body = self.config["default_body"]
        
        # Validate inputs
        if not recipient_email or not edl_file_path:
            self.logger.error("Missing required parameters: recipient_email or edl_file_path")
            return {"success": False, "error": "Missing required parameters"}
        
        if not os.path.exists(edl_file_path):
            self.logger.error(f"EDL file not found: {edl_file_path}")
            return {"success": False, "error": "EDL file not found"}
        
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = f"{self.config['sender_name']} <{self.config['sender_email']}>"
            msg['To'] = recipient_email
            msg['Subject'] = subject
            
            # Add CC and BCC if provided
            if cc:
                msg['Cc'] = ", ".join(cc) if isinstance(cc, list) else cc
            
            if bcc:
                msg['Bcc'] = ", ".join(bcc) if isinstance(bcc, list) else bcc
            
            # Add body
            msg.attach(MIMEText(body, 'plain'))
            
            # Add EDL attachment
            with open(edl_file_path, 'rb') as file:
                attachment = MIMEApplication(file.read(), Name=os.path.basename(edl_file_path))
            
            attachment['Content-Disposition'] = f'attachment; filename="{os.path.basename(edl_file_path)}"'
            msg.attach(attachment)
            
            # Add additional attachments if provided
            if additional_attachments:
                for file_path in additional_attachments:
                    if os.path.exists(file_path):
                        with open(file_path, 'rb') as file:
                            attachment = MIMEApplication(file.read(), Name=os.path.basename(file_path))
                        
                        attachment['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
                        msg.attach(attachment)
            
            # Send email
            if self.config["smtp_server"] != "smtp.example.com" and self.config["username"]:
                # Real email sending
                with smtplib.SMTP(self.config["smtp_server"], self.config["smtp_port"]) as server:
                    if self.config["use_tls"]:
                        server.starttls()
                    
                    if self.config["username"] and self.config["password"]:
                        server.login(self.config["username"], self.config["password"])
                    
                    server.send_message(msg)
                
                self.logger.info(f"Email sent to {recipient_email} with EDL file {edl_file_path}")
                
                return {
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "recipient": recipient_email,
                    "subject": subject,
                    "attachments": [edl_file_path] + (additional_attachments or [])
                }
            else:
                # Simulated email sending for development/testing
                self.logger.info(f"[SIMULATED] Email would be sent to {recipient_email} with EDL file {edl_file_path}")
                
                return {
                    "success": True,
                    "simulated": True,
                    "timestamp": datetime.now().isoformat(),
                    "recipient": recipient_email,
                    "subject": subject,
                    "attachments": [edl_file_path] + (additional_attachments or [])
                }
            
        except Exception as e:
            error_msg = f"Error sending email: {str(e)}"
            self.logger.error(error_msg)
            return {"success": False, "error": error_msg}
