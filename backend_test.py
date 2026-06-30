#!/usr/bin/env python3
"""
Comprehensive backend test for r1zl410 beats secure paid-download flow.
Tests the complete security hardening implementation.
"""

import requests
import sys
import json
import io
from pathlib import Path

# Configuration
BASE_URL = "https://vulnscan-first.preview.emergentagent.com/api"
ADMIN_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbl9pZCI6InRlc3QtYWRtaW4tMDAwMC0wMDAwLTAwMDAwMDAwMDAwMSIsImV4cCI6MTc4Mjk0ODY2N30.IkGU8HmWuUUlx3Z5mLyQECMicooYMUR4vtLPUCmnWZk"

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name, details=""):
        self.passed.append((test_name, details))
        print(f"✅ PASS: {test_name}")
        if details:
            print(f"   {details}")
    
    def add_fail(self, test_name, details=""):
        self.failed.append((test_name, details))
        print(f"❌ FAIL: {test_name}")
        if details:
            print(f"   {details}")
    
    def add_warning(self, test_name, details=""):
        self.warnings.append((test_name, details))
        print(f"⚠️  WARNING: {test_name}")
        if details:
            print(f"   {details}")
    
    def summary(self):
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"✅ Passed: {len(self.passed)}")
        print(f"❌ Failed: {len(self.failed)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        
        if self.failed:
            print("\n❌ FAILED TESTS:")
            for name, details in self.failed:
                print(f"  - {name}")
                if details:
                    print(f"    {details}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for name, details in self.warnings:
                print(f"  - {name}")
                if details:
                    print(f"    {details}")
        
        return len(self.failed) == 0

def create_dummy_file(filename, content, content_type):
    """Create a small dummy file for testing"""
    return (filename, io.BytesIO(content), content_type)

def test_secure_download_flow():
    """Test the complete secure paid-download flow"""
    results = TestResults()
    
    print("="*70)
    print("TESTING r1zl410 BEATS SECURE PAID-DOWNLOAD FLOW")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print(f"Using pre-generated admin JWT token")
    print("="*70 + "\n")
    
    # Store test data
    beat_id = None
    beat_id_no_untagged = None
    payment_id = None
    payment_id_no_file = None
    download_token = None
    untagged_path = None
    cover_path = None
    audio_path = None
    
    headers_admin = {"Authorization": f"Bearer {ADMIN_JWT}"}
    
    # ========================================================================
    # TEST 1: CREATE BEAT (admin) with all three files
    # ========================================================================
    print("\n[TEST 1] CREATE BEAT with tagged + untagged audio")
    print("-" * 70)
    
    try:
        # Create small dummy files
        cover_data = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100  # Tiny PNG header + padding
        audio_tagged = b'ID3' + b'\x00' * 200  # Tiny MP3-like data
        audio_untagged = b'ID3' + b'\x00' * 300  # Slightly different
        
        files = {
            'cover': create_dummy_file('cover.jpg', cover_data, 'image/jpeg'),
            'audio': create_dummy_file('tagged.mp3', audio_tagged, 'audio/mpeg'),
            'audio_untagged': create_dummy_file('untagged.mp3', audio_untagged, 'audio/mpeg')
        }
        
        data = {
            'title': 'Test Beat Secure Flow',
            'bpm': '140',
            'key': 'C Minor',
            'price_mp3': '24.99',
            'price_wav': '39.99',
            'price_stems': '99.99'
        }
        
        response = requests.post(
            f"{BASE_URL}/beats",
            headers=headers_admin,
            data=data,
            files=files,
            timeout=60
        )
        
        if response.status_code == 200:
            beat_data = response.json()
            beat_id = beat_data.get('id')
            cover_path = beat_data.get('cover_path', '')
            audio_path = beat_data.get('audio_path', '')
            # Note: full_audio_path should NOT be in response
            results.add_pass(
                "1) Create beat with untagged audio",
                f"Beat ID: {beat_id}, Status: {response.status_code}"
            )
        else:
            results.add_fail(
                "1) Create beat with untagged audio",
                f"Expected 200, got {response.status_code}: {response.text}"
            )
            return results
    except Exception as e:
        results.add_fail("1) Create beat with untagged audio", f"Exception: {str(e)}")
        return results
    
    # ========================================================================
    # TEST 2: PUBLIC LEAK CHECK - GET /api/beats and /api/beats/{id}
    # ========================================================================
    print("\n[TEST 2] PUBLIC LEAK CHECK - full_audio_path must NOT be exposed")
    print("-" * 70)
    
    try:
        # Check beats list
        response = requests.get(f"{BASE_URL}/beats", timeout=30)
        if response.status_code == 200:
            beats = response.json()
            leaked = False
            for beat in beats:
                if 'full_audio_path' in beat:
                    leaked = True
                    break
            
            if not leaked:
                results.add_pass("2a) GET /api/beats - no full_audio_path leak")
            else:
                results.add_fail("2a) GET /api/beats - full_audio_path LEAKED in response")
        else:
            results.add_fail("2a) GET /api/beats", f"Expected 200, got {response.status_code}")
        
        # Check specific beat
        response = requests.get(f"{BASE_URL}/beats/{beat_id}", timeout=30)
        if response.status_code == 200:
            beat = response.json()
            if 'full_audio_path' not in beat:
                results.add_pass(
                    "2b) GET /api/beats/{id} - no full_audio_path leak",
                    f"Response contains: {list(beat.keys())}"
                )
                # Infer the untagged path for later tests
                if audio_path:
                    # Pattern: r1zl410-beats/audio/{id}.mp3 -> r1zl410-beats/full/{id}.mp3
                    untagged_path = audio_path.replace('/audio/', '/full/')
            else:
                results.add_fail("2b) GET /api/beats/{id} - full_audio_path LEAKED")
        else:
            results.add_fail("2b) GET /api/beats/{id}", f"Expected 200, got {response.status_code}")
    except Exception as e:
        results.add_fail("2) Public leak check", f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 3: FILE GATING - /api/files endpoint security
    # ========================================================================
    print("\n[TEST 3] FILE GATING - /api/files security")
    print("-" * 70)
    
    # 3a: Untagged file must be blocked (403)
    if untagged_path:
        try:
            response = requests.get(f"{BASE_URL}/files/{untagged_path}", timeout=30)
            if response.status_code == 403:
                results.add_pass(
                    "3a) GET /api/files/{untagged} returns 403",
                    f"Correctly blocked: {untagged_path}"
                )
            else:
                results.add_fail(
                    "3a) GET /api/files/{untagged} should return 403",
                    f"Got {response.status_code} - SECURITY ISSUE!"
                )
        except Exception as e:
            results.add_fail("3a) Untagged file blocking", f"Exception: {str(e)}")
    else:
        results.add_warning("3a) Untagged file blocking", "Could not infer untagged path")
    
    # 3b: Cover file should work (200)
    if cover_path:
        try:
            response = requests.get(f"{BASE_URL}/files/{cover_path}", timeout=30)
            if response.status_code == 200:
                results.add_pass(
                    "3b) GET /api/files/{cover} returns 200",
                    f"Cover accessible: {len(response.content)} bytes"
                )
            else:
                results.add_fail(
                    "3b) GET /api/files/{cover} should return 200",
                    f"Got {response.status_code}"
                )
        except Exception as e:
            results.add_fail("3b) Cover file access", f"Exception: {str(e)}")
    
    # 3c: Tagged audio should work (200)
    if audio_path:
        try:
            response = requests.get(f"{BASE_URL}/files/{audio_path}", timeout=30)
            if response.status_code == 200:
                results.add_pass(
                    "3c) GET /api/files/{audio_tagged} returns 200",
                    f"Tagged audio accessible: {len(response.content)} bytes"
                )
            else:
                results.add_fail(
                    "3c) GET /api/files/{audio_tagged} should return 200",
                    f"Got {response.status_code}"
                )
        except Exception as e:
            results.add_fail("3c) Tagged audio access", f"Exception: {str(e)}")
    
    # 3d: Path traversal should be blocked (400)
    try:
        response = requests.get(f"{BASE_URL}/files/../../../etc/passwd", timeout=30)
        if response.status_code == 400:
            results.add_pass("3d) Path traversal (..) returns 400")
        else:
            results.add_fail(
                "3d) Path traversal should return 400",
                f"Got {response.status_code} - SECURITY ISSUE!"
            )
    except Exception as e:
        results.add_fail("3d) Path traversal blocking", f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 4: REMOVED INSECURE ENDPOINT - POST /api/payments/create
    # ========================================================================
    print("\n[TEST 4] REMOVED INSECURE ENDPOINT - /api/payments/create")
    print("-" * 70)
    
    try:
        response = requests.post(
            f"{BASE_URL}/payments/create",
            json={"beat_id": beat_id, "price_type": "mp3", "paypal_order_id": "fake"},
            timeout=30
        )
        if response.status_code in [404, 405]:
            results.add_pass(
                "4) POST /api/payments/create returns 404/405",
                f"Endpoint correctly removed (status: {response.status_code})"
            )
        else:
            results.add_fail(
                "4) POST /api/payments/create should return 404/405",
                f"Got {response.status_code} - INSECURE ENDPOINT STILL EXISTS!"
            )
    except Exception as e:
        results.add_fail("4) Removed insecure endpoint", f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 5: RECORD MANUAL PAYMENT - validation
    # ========================================================================
    print("\n[TEST 5] RECORD MANUAL PAYMENT - validation")
    print("-" * 70)
    
    # 5a: Missing buyer_email should fail (422)
    try:
        response = requests.post(
            f"{BASE_URL}/payments/record-manual",
            params={"beat_id": beat_id, "price_type": "mp3"},
            timeout=30
        )
        if response.status_code == 422:
            results.add_pass("5a) record-manual without buyer_email returns 422")
        else:
            results.add_fail(
                "5a) record-manual without buyer_email should return 422",
                f"Got {response.status_code}"
            )
    except Exception as e:
        results.add_fail("5a) Missing buyer_email validation", f"Exception: {str(e)}")
    
    # 5b: Invalid email should fail (400)
    try:
        response = requests.post(
            f"{BASE_URL}/payments/record-manual",
            params={"beat_id": beat_id, "price_type": "mp3", "buyer_email": "notanemail"},
            timeout=30
        )
        if response.status_code == 400:
            results.add_pass("5b) record-manual with invalid email returns 400")
        else:
            results.add_fail(
                "5b) record-manual with invalid email should return 400",
                f"Got {response.status_code}"
            )
    except Exception as e:
        results.add_fail("5b) Invalid email validation", f"Exception: {str(e)}")
    
    # 5c: Valid email should succeed (200) with pending_confirmation
    try:
        response = requests.post(
            f"{BASE_URL}/payments/record-manual",
            params={"beat_id": beat_id, "price_type": "mp3", "buyer_email": "buyer@example.com"},
            timeout=30
        )
        if response.status_code == 200:
            payment_data = response.json()
            payment_id = payment_data.get('payment_id')
            status = payment_data.get('status')
            if status == 'pending_confirmation':
                results.add_pass(
                    "5c) record-manual with valid email returns 200",
                    f"Payment ID: {payment_id}, Status: {status}"
                )
            else:
                results.add_fail(
                    "5c) record-manual status should be pending_confirmation",
                    f"Got status: {status}"
                )
        else:
            results.add_fail(
                "5c) record-manual with valid email should return 200",
                f"Got {response.status_code}: {response.text}"
            )
    except Exception as e:
        results.add_fail("5c) Valid email payment creation", f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 6: CONFIRM PAYMENT (admin) - token generation
    # ========================================================================
    print("\n[TEST 6] CONFIRM PAYMENT (admin) - token generation")
    print("-" * 70)
    
    # 6a: Confirm payment with untagged file
    if payment_id:
        try:
            response = requests.post(
                f"{BASE_URL}/payments/{payment_id}/confirm",
                headers=headers_admin,
                timeout=30
            )
            if response.status_code == 200:
                confirm_data = response.json()
                status = confirm_data.get('status')
                download_token = confirm_data.get('download_token')
                email_sent = confirm_data.get('email_sent')
                
                if status == 'confirmed' and download_token:
                    results.add_pass(
                        "6a) Confirm payment returns 200 with token",
                        f"Status: {status}, Token: {download_token[:20]}..., Email sent: {email_sent}"
                    )
                    if not email_sent:
                        results.add_warning(
                            "6a) Email delivery",
                            "email_sent=false (acceptable in test env)"
                        )
                else:
                    results.add_fail(
                        "6a) Confirm payment should return status=confirmed and download_token",
                        f"Got status={status}, token={download_token}"
                    )
            else:
                results.add_fail(
                    "6a) Confirm payment should return 200",
                    f"Got {response.status_code}: {response.text}"
                )
        except Exception as e:
            results.add_fail("6a) Confirm payment", f"Exception: {str(e)}")
    else:
        results.add_warning("6a) Confirm payment", "No payment_id from previous test")
    
    # 6b: Create beat WITHOUT untagged file and try to confirm payment
    print("\n[TEST 6b] Confirm payment for beat WITHOUT untagged file")
    try:
        # Create beat without audio_untagged
        files_no_untagged = {
            'cover': create_dummy_file('cover2.jpg', b'\x89PNG\r\n\x1a\n' + b'\x00' * 100, 'image/jpeg'),
            'audio': create_dummy_file('tagged2.mp3', b'ID3' + b'\x00' * 200, 'audio/mpeg')
        }
        
        data_no_untagged = {
            'title': 'Test Beat No Untagged',
            'bpm': '120',
            'key': 'D Major',
            'price_mp3': '19.99',
            'price_wav': '29.99',
            'price_stems': '79.99'
        }
        
        response = requests.post(
            f"{BASE_URL}/beats",
            headers=headers_admin,
            data=data_no_untagged,
            files=files_no_untagged,
            timeout=60
        )
        
        if response.status_code == 200:
            beat_no_untagged = response.json()
            beat_id_no_untagged = beat_no_untagged.get('id')
            
            # Create payment for this beat
            response = requests.post(
                f"{BASE_URL}/payments/record-manual",
                params={"beat_id": beat_id_no_untagged, "price_type": "mp3", "buyer_email": "buyer2@example.com"},
                timeout=30
            )
            
            if response.status_code == 200:
                payment_no_file = response.json()
                payment_id_no_file = payment_no_file.get('payment_id')
                
                # Try to confirm - should fail with 400
                response = requests.post(
                    f"{BASE_URL}/payments/{payment_id_no_file}/confirm",
                    headers=headers_admin,
                    timeout=30
                )
                
                if response.status_code == 400:
                    results.add_pass(
                        "6b) Confirm payment without untagged file returns 400",
                        "Correctly rejects confirmation when full_audio_path is missing"
                    )
                else:
                    results.add_fail(
                        "6b) Confirm payment without untagged file should return 400",
                        f"Got {response.status_code}"
                    )
            else:
                results.add_warning("6b) Could not create payment for beat without untagged file")
        else:
            results.add_warning("6b) Could not create beat without untagged file")
    except Exception as e:
        results.add_fail("6b) Confirm payment without untagged file", f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 7: DOWNLOAD INFO - token validation
    # ========================================================================
    print("\n[TEST 7] DOWNLOAD INFO - token validation")
    print("-" * 70)
    
    if download_token:
        try:
            response = requests.get(
                f"{BASE_URL}/download/{download_token}/info",
                timeout=30
            )
            if response.status_code == 200:
                info = response.json()
                valid = info.get('valid')
                downloads_left = info.get('downloads_left')
                beat_title = info.get('beat_title')
                license_label = info.get('license_label')
                expires_at = info.get('expires_at')
                
                if valid and downloads_left == 2:
                    results.add_pass(
                        "7) GET /api/download/{token}/info returns valid info",
                        f"Valid: {valid}, Downloads left: {downloads_left}, Title: {beat_title}, License: {license_label}"
                    )
                else:
                    results.add_fail(
                        "7) Download info should show valid=true and downloads_left=2",
                        f"Got valid={valid}, downloads_left={downloads_left}"
                    )
            else:
                results.add_fail(
                    "7) GET /api/download/{token}/info should return 200",
                    f"Got {response.status_code}"
                )
        except Exception as e:
            results.add_fail("7) Download info", f"Exception: {str(e)}")
    else:
        results.add_warning("7) Download info", "No download_token from previous test")
    
    # ========================================================================
    # TEST 8: DOWNLOAD FILE + LIMIT - 2 downloads max
    # ========================================================================
    print("\n[TEST 8] DOWNLOAD FILE + LIMIT - 2 downloads max")
    print("-" * 70)
    
    if download_token:
        # 8a: First download
        try:
            response = requests.get(
                f"{BASE_URL}/download/{download_token}",
                timeout=30
            )
            if response.status_code == 200:
                content_disp = response.headers.get('Content-Disposition', '')
                if 'attachment' in content_disp:
                    results.add_pass(
                        "8a) First download returns 200 with attachment",
                        f"Size: {len(response.content)} bytes, Header: {content_disp}"
                    )
                else:
                    results.add_fail(
                        "8a) First download should have Content-Disposition: attachment",
                        f"Got: {content_disp}"
                    )
            else:
                results.add_fail(
                    "8a) First download should return 200",
                    f"Got {response.status_code}"
                )
        except Exception as e:
            results.add_fail("8a) First download", f"Exception: {str(e)}")
        
        # 8b: Second download
        try:
            response = requests.get(
                f"{BASE_URL}/download/{download_token}",
                timeout=30
            )
            if response.status_code == 200:
                results.add_pass("8b) Second download returns 200")
            else:
                results.add_fail(
                    "8b) Second download should return 200",
                    f"Got {response.status_code}"
                )
        except Exception as e:
            results.add_fail("8b) Second download", f"Exception: {str(e)}")
        
        # 8c: Third download should fail (410)
        try:
            response = requests.get(
                f"{BASE_URL}/download/{download_token}",
                timeout=30
            )
            if response.status_code == 410:
                results.add_pass(
                    "8c) Third download returns 410 (limit reached)",
                    "Download limit correctly enforced"
                )
            else:
                results.add_fail(
                    "8c) Third download should return 410",
                    f"Got {response.status_code} - LIMIT NOT ENFORCED!"
                )
        except Exception as e:
            results.add_fail("8c) Third download limit", f"Exception: {str(e)}")
        
        # 8d: Check info after limit reached
        try:
            response = requests.get(
                f"{BASE_URL}/download/{download_token}/info",
                timeout=30
            )
            if response.status_code == 200:
                info = response.json()
                valid = info.get('valid')
                reason = info.get('reason')
                if not valid and reason == 'limit_reached':
                    results.add_pass(
                        "8d) Info after limit shows valid=false, reason=limit_reached"
                    )
                else:
                    results.add_fail(
                        "8d) Info after limit should show valid=false, reason=limit_reached",
                        f"Got valid={valid}, reason={reason}"
                    )
            else:
                results.add_fail(
                    "8d) Info endpoint should return 200",
                    f"Got {response.status_code}"
                )
        except Exception as e:
            results.add_fail("8d) Info after limit", f"Exception: {str(e)}")
    else:
        results.add_warning("8) Download file + limit", "No download_token from previous test")
    
    # 8e: Bad token should return 404
    try:
        response = requests.get(
            f"{BASE_URL}/download/bad-token-12345",
            timeout=30
        )
        if response.status_code == 404:
            results.add_pass("8e) Bad download token returns 404")
        else:
            results.add_fail(
                "8e) Bad download token should return 404",
                f"Got {response.status_code}"
            )
    except Exception as e:
        results.add_fail("8e) Bad token handling", f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 9: AUTH GUARD - endpoints require admin JWT
    # ========================================================================
    print("\n[TEST 9] AUTH GUARD - admin endpoints require JWT")
    print("-" * 70)
    
    # 9a: POST /api/beats without auth
    try:
        files_no_auth = {
            'cover': create_dummy_file('cover3.jpg', b'\x89PNG\r\n\x1a\n' + b'\x00' * 50, 'image/jpeg'),
            'audio': create_dummy_file('audio3.mp3', b'ID3' + b'\x00' * 100, 'audio/mpeg')
        }
        data_no_auth = {'title': 'Unauthorized Beat', 'price_mp3': '9.99', 'price_wav': '19.99', 'price_stems': '49.99'}
        
        response = requests.post(
            f"{BASE_URL}/beats",
            data=data_no_auth,
            files=files_no_auth,
            timeout=30
        )
        if response.status_code in [401, 403]:
            results.add_pass(
                "9a) POST /api/beats without auth returns 401/403",
                f"Status: {response.status_code}"
            )
        else:
            results.add_fail(
                "9a) POST /api/beats without auth should return 401/403",
                f"Got {response.status_code} - AUTH NOT ENFORCED!"
            )
    except Exception as e:
        results.add_fail("9a) POST beats auth guard", f"Exception: {str(e)}")
    
    # 9b: POST /api/payments/{id}/confirm without auth
    if payment_id:
        try:
            response = requests.post(
                f"{BASE_URL}/payments/{payment_id}/confirm",
                timeout=30
            )
            if response.status_code in [401, 403]:
                results.add_pass(
                    "9b) POST /api/payments/{id}/confirm without auth returns 401/403",
                    f"Status: {response.status_code}"
                )
            else:
                results.add_fail(
                    "9b) POST /api/payments/{id}/confirm without auth should return 401/403",
                    f"Got {response.status_code} - AUTH NOT ENFORCED!"
                )
        except Exception as e:
            results.add_fail("9b) Confirm payment auth guard", f"Exception: {str(e)}")
    
    # ========================================================================
    # FINAL SUMMARY
    # ========================================================================
    print("\n" + "="*70)
    success = results.summary()
    print("="*70)
    
    return results

if __name__ == "__main__":
    results = test_secure_download_flow()
    sys.exit(0 if len(results.failed) == 0 else 1)
