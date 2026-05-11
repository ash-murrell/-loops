# Loops

A daily spread app for capturing open loops, planning the day, and closing it out in the evening.

## Deploy to Vercel

This project is set up to deploy with zero config.

1. Push this folder to a new GitHub repository.
2. Sign in to vercel.com with your GitHub account.
3. Click "Add New… → Project" and import the repo.
4. Vercel auto-detects Vite. Click "Deploy".
5. Wait about a minute. You'll get a URL like `loops.vercel.app`.

## Add to iPhone home screen

1. Open the URL in Safari (not Chrome — only Safari supports installing).
2. Tap the Share icon at the bottom.
3. Scroll and tap "Add to Home Screen".
4. The app icon appears on the home screen and opens full-screen like a native app.

## Notes

Data lives in the browser of whoever is using the app (localStorage). It does not sync between devices. To make it shared between two phones, the next step would be adding Supabase for a backend.
