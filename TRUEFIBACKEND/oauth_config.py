# OAuth Configuration for TrueFi Backend
# Supports Google, Microsoft, and Apple OAuth providers

import os
from typing import Dict, Any

def get_oauth_config(provider: str) -> Dict[str, Any]:
    """Get OAuth configuration for a specific provider"""
    
    if provider == 'google':
        return {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url': 'https://oauth2.googleapis.com/token',
            'scopes': ['openid', 'email', 'profile'],
            'redirect_uri': os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/auth/callback/google')
        }
    
    elif provider == 'microsoft':
        return {
            'client_id': os.getenv('MICROSOFT_CLIENT_ID'),
            'client_secret': os.getenv('MICROSOFT_CLIENT_SECRET'),
            'auth_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            'token_url': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            'scopes': ['openid', 'email', 'profile'],
            'redirect_uri': os.getenv('MICROSOFT_REDIRECT_URI', 'http://localhost:3000/api/auth/callback/microsoft')
        }
    
    elif provider == 'apple':
        return {
            'client_id': os.getenv('APPLE_CLIENT_ID'),
            'client_secret': os.getenv('APPLE_CLIENT_SECRET'),
            'auth_url': 'https://appleid.apple.com/auth/authorize',
            'token_url': 'https://appleid.apple.com/auth/token',
            'scopes': ['openid', 'email', 'name'],
            'redirect_uri': os.getenv('APPLE_REDIRECT_URI', 'http://localhost:3000/api/auth/callback/apple')
        }
    
    else:
        raise ValueError(f"Unsupported OAuth provider: {provider}")

def validate_oauth_config(provider: str) -> bool:
    """Validate that OAuth configuration is complete for a provider"""
    try:
        config = get_oauth_config(provider)
        required_fields = ['client_id', 'client_secret']
        
        for field in required_fields:
            if not config.get(field):
                return False
        
        return True
    except ValueError:
        return False

def get_supported_providers() -> list:
    """Get list of supported OAuth providers"""
    return ['google', 'microsoft', 'apple']

def get_provider_display_name(provider: str) -> str:
    """Get human-readable name for OAuth provider"""
    provider_names = {
        'google': 'Google',
        'microsoft': 'Microsoft',
        'apple': 'Apple'
    }
    return provider_names.get(provider, provider.title()) 