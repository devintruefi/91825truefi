# OAuth Authentication for TrueFi Backend
# Currently supports Google OAuth, with placeholders for Microsoft and Apple

import os
import json
import secrets
import aiohttp
from typing import Dict, Any, Tuple
from oauth_config import get_oauth_config

class GoogleOAuth:
    """Google OAuth implementation"""
    
    def __init__(self):
        self.config = get_oauth_config('google')
        self.client_id = self.config['client_id']
        self.client_secret = self.config['client_secret']
        self.auth_url = self.config['auth_url']
        self.token_url = self.config['token_url']
        self.scopes = self.config['scopes']
    
    def generate_oauth_url(self, redirect_uri: str) -> Tuple[str, str]:
        """Generate OAuth authorization URL"""
        state = secrets.token_urlsafe(32)
        
        params = {
            'client_id': self.client_id,
            'redirect_uri': redirect_uri,
            'scope': ' '.join(self.scopes),
            'response_type': 'code',
            'state': state,
            'access_type': 'offline',
            'prompt': 'consent'
        }
        
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        auth_url = f"{self.auth_url}?{query_string}"
        
        return auth_url, state
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access and ID tokens"""
        async with aiohttp.ClientSession() as session:
            data = {
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': redirect_uri
            }
            
            async with session.post(self.token_url, data=data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Token exchange failed: {error_text}")
                
                token_data = await response.json()
                return token_data
    
    async def verify_id_token(self, id_token: str) -> Dict[str, Any]:
        """Verify Google ID token and extract user information"""
        # In production, you should verify the JWT signature
        # For now, we'll decode the JWT payload without verification
        import jwt
        
        try:
            # Decode without verification for now
            # In production, verify with Google's public keys
            payload = jwt.decode(id_token, options={"verify_signature": False})
            return payload
        except Exception as e:
            raise Exception(f"Failed to decode ID token: {e}")
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from Google API"""
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        
        async with aiohttp.ClientSession() as session:
            headers = {'Authorization': f'Bearer {access_token}'}
            
            async with session.get(userinfo_url, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Failed to get user info: {error_text}")
                
                user_info = await response.json()
                return user_info

# Create global instance
google_oauth = GoogleOAuth()

class MicrosoftOAuth:
    """Microsoft OAuth implementation (placeholder)"""
    
    def __init__(self):
        self.config = get_oauth_config('microsoft')
    
    def generate_oauth_url(self, redirect_uri: str) -> Tuple[str, str]:
        """Generate Microsoft OAuth authorization URL"""
        # Placeholder implementation
        raise NotImplementedError("Microsoft OAuth not yet implemented")
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        # Placeholder implementation
        raise NotImplementedError("Microsoft OAuth not yet implemented")

class AppleOAuth:
    """Apple OAuth implementation (placeholder)"""
    
    def __init__(self):
        self.config = get_oauth_config('apple')
    
    def generate_oauth_url(self, redirect_uri: str) -> Tuple[str, str]:
        """Generate Apple OAuth authorization URL"""
        # Placeholder implementation
        raise NotImplementedError("Apple OAuth not yet implemented")
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        # Placeholder implementation
        raise NotImplementedError("Apple OAuth not yet implemented")

# Factory function to get OAuth provider
def get_oauth_provider(provider: str):
    """Get OAuth provider instance"""
    if provider == 'google':
        return google_oauth
    elif provider == 'microsoft':
        return MicrosoftOAuth()
    elif provider == 'apple':
        return AppleOAuth()
    else:
        raise ValueError(f"Unsupported OAuth provider: {provider}") 