import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class BeatsAPITester:
    def __init__(self, base_url="https://soundwave-gallery.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_id = None
        self.beat_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart
                    if 'Content-Type' in test_headers:
                        del test_headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=test_headers, timeout=60)
                else:
                    response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_admin_check(self):
        """Test admin existence check"""
        success, response = self.run_test(
            "Admin Existence Check",
            "GET",
            "admin/check",
            200
        )
        return success, response

    def test_admin_register(self, email, password):
        """Test admin registration"""
        success, response = self.run_test(
            "Admin Registration",
            "POST",
            "admin/register",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_id = response.get('admin_id')
            print(f"   Admin registered with ID: {self.admin_id}")
            return True
        return False

    def test_admin_login(self, email, password):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_id = response.get('admin_id')
            print(f"   Admin logged in with ID: {self.admin_id}")
            return True
        return False

    def test_admin_profile(self):
        """Test getting admin profile"""
        success, response = self.run_test(
            "Admin Profile",
            "GET",
            "admin/me",
            200
        )
        return success

    def test_get_stats(self):
        """Test getting admin stats"""
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "stats",
            200
        )
        return success, response

    def test_get_beats(self):
        """Test getting beats list"""
        success, response = self.run_test(
            "Get Beats List",
            "GET",
            "beats",
            200
        )
        return success, response

    def test_create_beat(self, title, price_mp3=29.99, price_wav=49.99, price_stems=99.99):
        """Test creating a beat with mock files"""
        # Create mock files
        mock_cover = ("test_cover.jpg", b"fake_image_data", "image/jpeg")
        mock_audio = ("test_audio.mp3", b"fake_audio_data", "audio/mpeg")
        
        files = {
            'cover': mock_cover,
            'audio': mock_audio
        }
        
        data = {
            'title': title,
            'price_mp3': str(price_mp3),
            'price_wav': str(price_wav),
            'price_stems': str(price_stems)
        }

        success, response = self.run_test(
            "Create Beat",
            "POST",
            "beats",
            200,
            data=data,
            files=files
        )
        
        if success and 'id' in response:
            self.beat_id = response['id']
            print(f"   Beat created with ID: {self.beat_id}")
            return True, response
        return False, {}

    def test_get_beat(self, beat_id):
        """Test getting a specific beat"""
        success, response = self.run_test(
            "Get Specific Beat",
            "GET",
            f"beats/{beat_id}",
            200
        )
        return success

    def test_delete_beat(self, beat_id):
        """Test deleting a beat"""
        success, response = self.run_test(
            "Delete Beat",
            "DELETE",
            f"beats/{beat_id}",
            200
        )
        return success

    def test_paypal_client_id(self):
        """Test getting PayPal client ID"""
        success, response = self.run_test(
            "PayPal Client ID",
            "GET",
            "paypal/client-id",
            200
        )
        return success

    def test_create_payment(self, beat_id, price_type="mp3"):
        """Test creating a payment"""
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "payments/create",
            200,
            data={
                "beat_id": beat_id,
                "price_type": price_type,
                "paypal_order_id": "test_order_123"
            }
        )
        return success

    def test_get_payments(self):
        """Test getting payments list"""
        success, response = self.run_test(
            "Get Payments",
            "GET",
            "payments",
            200
        )
        return success

def main():
    print("🎵 Starting r1zl410 Beats API Testing...")
    print("=" * 50)
    
    tester = BeatsAPITester()
    test_email = f"admin_{datetime.now().strftime('%H%M%S')}@test.com"
    test_password = "TestPass123!"

    # Test 1: Health check
    if not tester.test_health_check():
        print("❌ API health check failed, stopping tests")
        return 1

    # Test 2: Check admin existence
    admin_check_success, admin_check_data = tester.test_admin_check()
    if not admin_check_success:
        print("❌ Admin check failed")
        return 1

    # Test 3: Admin registration or login
    admin_exists = admin_check_data.get('exists', False)
    if not admin_exists:
        print("📝 No admin exists, testing registration...")
        if not tester.test_admin_register(test_email, test_password):
            print("❌ Admin registration failed, stopping tests")
            return 1
    else:
        print("👤 Admin exists, testing with existing admin...")
        # Try to login with a common test account or skip login tests
        print("⚠️  Skipping login test as admin already exists")

    # Test 4: Admin profile (if we have a token)
    if tester.token:
        if not tester.test_admin_profile():
            print("❌ Admin profile test failed")

    # Test 5: Get stats
    if tester.token:
        stats_success, stats_data = tester.test_get_stats()
        if not stats_success:
            print("❌ Stats test failed")

    # Test 6: Get beats list
    beats_success, beats_data = tester.test_get_beats()
    if not beats_success:
        print("❌ Get beats test failed")
        return 1

    # Test 7: Create beat (if we have admin token)
    if tester.token:
        beat_success, beat_data = tester.test_create_beat("Test Beat " + datetime.now().strftime('%H%M%S'))
        if beat_success:
            # Test 8: Get specific beat
            if not tester.test_get_beat(tester.beat_id):
                print("❌ Get specific beat test failed")

            # Test 9: Create payment
            if not tester.test_create_payment(tester.beat_id):
                print("❌ Create payment test failed")

            # Test 10: Get payments
            if not tester.test_get_payments():
                print("❌ Get payments test failed")

            # Test 11: Delete beat
            if not tester.test_delete_beat(tester.beat_id):
                print("❌ Delete beat test failed")

    # Test 12: PayPal client ID
    if not tester.test_paypal_client_id():
        print("❌ PayPal client ID test failed")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())