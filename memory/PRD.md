# r1zl410 Beats Website PRD

## Original Problem Statement
Build a website with Apple clean style look for uploading beats/music/instrumentals with cover art (1x1). Features an infinite carousel moving right to left, pausing on hover. Minimal design with Instagram link (top right) and site name (top left). Admin system for beat uploads, JWT authentication, and PayPal payment integration. Beat modal opens on click with blur background, audio player, and arrow key navigation.

## User Personas
1. **Beat Buyer**: Music artists looking to purchase beats for their projects
2. **Admin (r1zl410)**: Site owner managing beat catalog and sales

## Core Requirements
- [x] Apple-clean dark aesthetic (#000000 background)
- [x] Smooth infinite horizontal carousel (60fps CSS animation)
- [x] Carousel pauses on hover
- [x] Header with site name (left) and Instagram link (right)
- [x] Beat modal with glassmorphism blur background
- [x] Audio player with play/pause and progress bar
- [x] Keyboard navigation (ArrowLeft, ArrowRight, Escape)
- [x] Three pricing tiers (MP3, WAV, Stems)
- [x] PayPal payment integration
- [x] Admin JWT authentication (secure)
- [x] Admin dashboard with stats
- [x] Beat upload with cover art + audio file
- [x] Object storage for files (Emergent Storage)

## What's Been Implemented (March 22, 2026)

### Backend (FastAPI + MongoDB)
- Admin registration/login with JWT tokens
- Beat CRUD operations
- File upload/serving via Emergent Object Storage
- Payment recording endpoint
- Stats endpoint for dashboard

### Frontend (React + Tailwind + Framer Motion)
- Homepage with infinite carousel
- Beat modal with audio player
- Admin login page
- Admin dashboard with stats
- Admin upload page
- Dark theme with Outfit/Manrope fonts

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, PayPal React SDK
- **Backend**: FastAPI, Motor (MongoDB async), PyJWT, bcrypt
- **Storage**: Emergent Object Storage
- **Database**: MongoDB
- **Payment**: PayPal (sandbox mode)

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Homepage carousel
- [x] Beat modal with audio
- [x] Admin authentication
- [x] Beat upload system

### P1 (Important)
- [ ] PayPal production credentials setup
- [ ] Email notifications on purchase
- [ ] Beat download delivery system

### P2 (Nice to Have)
- [ ] Beat search/filter
- [ ] Multiple admin accounts
- [ ] Analytics dashboard
- [ ] Social sharing

## Next Tasks
1. Add your PayPal production credentials to enable real payments
2. Upload your actual beats (delete demo beats first)
3. Configure email notifications for purchases
4. Set up beat file delivery system after payment
