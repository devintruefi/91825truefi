# OAuth Setup Instructions for TrueFi

This guide will help you set up OAuth authentication for Google, Microsoft, and Apple Sign In.

## Prerequisites

1. Run the database migration to add OAuth columns:
```bash
psql -U truefi_user -d truefi_app_data -f migration_oauth_providers.sql
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy the Client ID and Client Secret
8. Add to your `.env.local`:
```env
GOOGLE_CLIENT_ID=118529284371-elg2rki3saed3930p4n8iv6jfv7famql.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOC SPX-RPB622A49_aQgSAwgmeJ_Pkt6NS5
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
GOOGLE_REDIRECT_URI=https://truefi.ai/api/auth/callback/google
```

## Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Set the name (e.g., "TrueFi OAuth")
5. Choose "Accounts in any organizational directory and personal Microsoft accounts"
6. Add redirect URI:
   - Type: Web
   - URI: `http://localhost:3000/api/auth/callback/microsoft`
7. After creation, go to "Certificates & secrets"
8. Create a new client secret
9. Copy the Application (client) ID and the client secret value
10. Add to your `.env.local`:
```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/callback/microsoft
MICROSOFT_TENANT=common
```

## Apple Sign In Setup

1. Go to [Apple Developer](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Create an App ID:
   - Choose "App IDs" → "+"
   - Select "App"
   - Add description and Bundle ID
   - Enable "Sign In with Apple"
4. Create a Service ID:
   - Choose "Services IDs" → "+"
   - Add description and identifier (this will be your APPLE_CLIENT_ID)
   - Enable "Sign In with Apple"
   - Configure domains and return URLs:
     - Domain: `localhost:3000` (for development)
     - Return URL: `http://localhost:3000/api/auth/callback/apple`
5. Create a Sign In with Apple Key:
   - Choose "Keys" → "+"
   - Add key name
   - Enable "Sign In with Apple"
   - Configure the key with your App ID
   - Download the .p8 file (save it securely!)
6. Add to your `.env.local`:
```env
APPLE_CLIENT_ID=your_service_id_here
APPLE_TEAM_ID=your_team_id_here
APPLE_KEY_ID=your_key_id_here
APPLE_PRIVATE_KEY=/path/to/AuthKey_XXXXX.p8
```

## Testing OAuth

1. Ensure the backend is running:
```bash
cd TRUEFIBACKEND
python main.py
```

2. Ensure the frontend is running:
```bash
npm run dev
```

3. Navigate to http://localhost:3000/auth
4. Click on the Google, Microsoft, or Apple sign-in buttons
5. Complete the OAuth flow
6. You should be redirected to the dashboard upon successful authentication

## Production Deployment

When deploying to production:

1. Update all redirect URIs in your OAuth provider settings to use your production domain
2. Update your environment variables:
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google
MICROSOFT_REDIRECT_URI=https://yourdomain.com/api/auth/callback/microsoft
APPLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/apple
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

3. Ensure your production domain is verified with each OAuth provider
4. For Apple Sign In, you'll need to verify domain ownership

## Troubleshooting

### Google OAuth Issues
- Ensure the Google+ API is enabled
- Check that redirect URIs match exactly (including trailing slashes)
- Verify client ID and secret are correct

### Microsoft OAuth Issues
- Ensure the app registration has the correct permissions
- Check that the tenant ID is correct (use 'common' for multi-tenant)
- Verify the redirect URI is registered

### Apple Sign In Issues
- Ensure the Service ID (not App ID) is used as the client ID
- Verify the .p8 key file path is correct
- Check that the key hasn't expired
- Ensure the return URL matches exactly

### General Issues
- Check backend logs for detailed error messages
- Verify database migration was successful
- Ensure all environment variables are set correctly
- Check network/firewall settings if callbacks fail

## Security Considerations

1. Never commit OAuth credentials to version control
2. Use environment variables for all sensitive data
3. Implement rate limiting on OAuth endpoints
4. Validate state parameter to prevent CSRF attacks
5. Use HTTPS in production
6. Regularly rotate client secrets
7. Monitor for suspicious OAuth activity