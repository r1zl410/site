# Test Credentials

## Admin (seeded for automated testing only)
- Email: test.admin@r1zl410.dev
- Password: TestAdmin#2025
- Admin ID: test-admin-0000-0000-000000000001

NOTE: Admin login uses 2FA (a 6-digit email code), so password login can't be
completed by automated tests. Use the pre-generated JWT below as a Bearer token
for admin-protected endpoints.

### Pre-generated JWT (valid 24h from seeding; re-run `python /app/scripts/seed_admin.py` to refresh)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbl9pZCI6InRlc3QtYWRtaW4tMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsImV4cCI6MTc4Mjk0ODY2N30.IkGU8HmWuUUlx3Z5mLyQECMicooYMUR4vtLPUCmnWZk

To regenerate the token: `python /app/scripts/seed_admin.py` (prints JWT_TOKEN).

IMPORTANT: This is a TEST admin. Because the app allows only one admin, this seed
admin must be removed before the real owner registers their own admin account.
