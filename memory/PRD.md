# r1zl410 Beats Website PRD

## Original Problem Statement
Build a website with Apple clean style look for uploading beats/music/instrumentals with cover art (1x1). Features an infinite carousel moving right to left, pausing on hover. Animations must be fluid/smooth. Website should be minimal - just Instagram link (top right), site name (top left). Need admin system for uploading beats with image/title, admin account creation, and PayPal.me payment system (personal account).

## Updates (June 2026)
- Added new two-column modal design (cover left, details right)
- Added navigation: BEATS and PACKS links
- Hover turns links red, active page has red underline
- Created landing page with rotating blurred backgrounds
- Created Packs page with carousel for drum kits/sound packs
- R1ZL410 logo links to landing page

## Pages
| URL | Description |
|-----|-------------|
| `/` | Landing page with animated backgrounds |
| `/beats` | Beats carousel |
| `/packs` | Sound packs carousel |
| `/admin/login` | Admin login with 2FA |
| `/admin` | Admin dashboard |
| `/admin/upload` | Upload beats |

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, Motor (MongoDB async), PyJWT, bcrypt, pyotp
- **Storage**: Emergent Object Storage
- **Database**: MongoDB
- **Payment**: PayPal.me (MTosku)

## What's Been Implemented
- Landing page with 3 rotating blurred backgrounds (5s interval)
- Navigation: R1ZL410 | BEATS | PACKS | Instagram
- Beats carousel with infinite scroll
- Packs carousel with demo packs
- Two-column modal with license selection (MP3/WAV/Stems)
- PayPal.me checkout flow
- Admin 2FA authentication
- Strong password requirements

## Next Tasks
1. Upload real beats (tagged preview + untagged full) and packs
2. Add BPM/Key fields to beat upload form
3. Create pack upload page in admin
4. Add email delivery system for purchased files

## Updates (Security + Paid Download Flow)
- Two-file beat model: TAGGED audio (public preview) + UNTAGGED audio (paid full file).
  Public API never exposes the untagged path; /api/files blocks the /full/ prefix.
- Purchase flow (PayPal.me): buyer enters email -> order saved as "pending_confirmation"
  -> opens PayPal.me link to pay.
- Admin confirms payment in dashboard "Ordini" tab -> generates a secure download token
  (valid 3 days, max 2 downloads) and emails the buyer a link to /download/:token.
- Removed insecure /api/payments/create (which marked payments "completed" without paying).
- CORS restricted to the configured frontend origin (no wildcard + credentials).
- IMPORTANT: For Resend to email arbitrary buyers, a verified sending domain is required.
  With the default onboarding@resend.dev sender, emails only deliver to the account owner.
