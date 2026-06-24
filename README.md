# Welcome to Antigravity!

Welcome to your new developer home! Your Firebase Studio project has been successfully migrated to Antigravity.

Antigravity is our next-generation, agent-first IDE designed for high-velocity, autonomous development. Because Antigravity runs locally on your machine, you now have access to powerful local workflows and fully integrated AI editing capabilities that go beyond a cloud-based web IDE.

## Getting Started
- **Run Locally**: Use the **Run and Debug** menu on the left sidebar to start your local development server.
  - Or in a terminal run `npm run dev` and visit `http://localhost:9002`.
- **Deploy**: You can deploy your changes to Firebase App Hosting by using the integrated terminal and standard Firebase CLI commands, just as you did in Firebase Studio.
- **Cleanup**: Cleanup unused artifacts with the @cleanup workflow.

Enjoy the next era of AI-driven development!

File any bugs at https://github.com/firebase/firebase-tools/issues

**Firebase Studio Export Date:** 2026-06-24


---

## Previous README.md contents:

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
