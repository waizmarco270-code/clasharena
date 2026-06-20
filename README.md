# CLASH ARENA

## Important: Google Login Setup
To ensure Google Login works in this environment, you MUST add your workspace domain to Firebase:

1. Copy the URL from your browser's address bar (e.g., `9002-xxx.cloudworkstations.dev`).
2. Go to [Firebase Console](https://console.firebase.google.com/).
3. Select your project.
4. Go to **Authentication** > **Settings** > **Authorized Domains**.
5. Click **Add Domain** and paste your workstation domain.
   - Example: `studio-7760131290-2f246.firebaseapp.com` is already added.
   - You need to add: `9002-your-workstation-id.us-central1.cloudworkstations.dev` (adjust to your specific URL).

## Cloudinary Configuration
Make sure to set your Cloudinary Cloud Name in your environment variables:
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name`
