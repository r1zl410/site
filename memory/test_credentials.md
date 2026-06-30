# Test Credentials

## Admin (for automated testing only)
Admin login uses 2FA (a 6-digit email code), so password login can't be completed
by automated tests. For testing admin-protected endpoints, (re)create a test admin
and get a valid JWT by running:

    python /app/scripts/seed_admin.py

It prints ADMIN_EMAIL / ADMIN_PASSWORD / JWT_TOKEN. Use the JWT as:

    Authorization: Bearer <JWT_TOKEN>

Seed admin values:
- Email: test.admin@r1zl410.dev
- Password: TestAdmin#2025
- Admin ID: test-admin-0000-0000-000000000001

IMPORTANT: The app allows only ONE admin. The test admin (and any test beats/
payments) are cleaned from the DB after testing so the real owner can register
their own admin via /admin/login. Re-run the seed script before each test session.
