#!/usr/bin/env python3
"""
Comprehensive Test Runner for TrueFi Chatbot Backend
Orchestrates all testing scripts and provides complete testing workflow
"""

import subprocess
import sys
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

class ComprehensiveTester:
    def __init__(self):
        self.results = []
        
    def log(self, message, level="INFO"):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_command(self, command, description, cwd=None):
        """Run a command and capture output"""
        self.log(f"Running: {description}")
        print(f"Command: {command}")
        print("-" * 50)
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=cwd
            )
            
            if result.stdout:
                print("STDOUT:")
                print(result.stdout)
            
            if result.stderr:
                print("STDERR:")
                print(result.stderr)
            
            print("-" * 50)
            
            if result.returncode == 0:
                self.log(f"✅ {description} completed successfully")
                self.results.append((description, "PASS"))
                return True
            else:
                self.log(f"❌ {description} failed with return code {result.returncode}", "ERROR")
                self.results.append((description, "FAIL"))
                return False
                
        except Exception as e:
            self.log(f"❌ {description} crashed: {str(e)}", "ERROR")
            self.results.append((description, "FAIL"))
            return False
    
    def check_environment(self):
        """Check if all required services are running"""
        self.log("Checking environment...")
        
        # Check if Next.js is running
        try:
            response = requests.get("http://localhost:3000", timeout=5)
            if response.status_code == 200:
                self.log("✅ Next.js frontend is running")
                self.results.append(("Next.js Frontend", "PASS"))
            else:
                self.log(f"⚠️ Next.js frontend responded with status {response.status_code}", "WARNING")
                self.results.append(("Next.js Frontend", "WARNING"))
        except:
            self.log("❌ Next.js frontend is not running", "ERROR")
            self.results.append(("Next.js Frontend", "FAIL"))
        
        # Check if FastAPI is running
        try:
            response = requests.get("http://localhost:8000/docs", timeout=5)
            if response.status_code == 200:
                self.log("✅ FastAPI backend is running")
                self.results.append(("FastAPI Backend", "PASS"))
            else:
                self.log(f"⚠️ FastAPI backend responded with status {response.status_code}", "WARNING")
                self.results.append(("FastAPI Backend", "WARNING"))
        except:
            self.log("❌ FastAPI backend is not running", "ERROR")
            self.results.append(("FastAPI Backend", "FAIL"))
        
        # Check environment variables
        required_vars = ["DATABASE_URL", "JWT_SECRET", "OPENAI_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            self.log(f"❌ Missing environment variables: {', '.join(missing_vars)}", "ERROR")
            self.results.append(("Environment Variables", "FAIL"))
        else:
            self.log("✅ All required environment variables are set")
            self.results.append(("Environment Variables", "PASS"))
    
    def find_test_user(self):
        """Find a suitable test user"""
        self.log("Finding test user...")
        return self.run_command(
            "python find_test_user.py",
            "Find Test User",
            cwd="TRUEFIBACKEND"
        )
    
    def run_backend_tests(self):
        """Run the comprehensive backend tests"""
        self.log("Running backend tests...")
        return self.run_command(
            "python test_backend.py",
            "Backend Tests",
            cwd="TRUEFIBACKEND"
        )
    
    def run_frontend_tests(self):
        """Run frontend integration tests"""
        self.log("Running frontend integration tests...")
        
        # Create a simple HTML file to run the frontend tests
        html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>Frontend Integration Tests</title>
</head>
<body>
    <h1>Frontend Integration Tests</h1>
    <div id="results"></div>
    <script src="../test_frontend_integration.js"></script>
    <script>
        // Run tests and display results
        window.addEventListener('load', async () => {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '<p>Running tests...</p>';
            
            try {
                await window.runFrontendTests();
                resultsDiv.innerHTML = '<p>✅ Tests completed. Check console for details.</p>';
            } catch (error) {
                resultsDiv.innerHTML = '<p>❌ Tests failed: ' + error.message + '</p>';
            }
        });
    </script>
</body>
</html>
        """
        
        with open("TRUEFIBACKEND/test_frontend.html", "w") as f:
            f.write(html_content)
        
        self.log("Frontend test HTML file created. Open TRUEFIBACKEND/test_frontend.html in browser to run tests.")
        self.results.append(("Frontend Tests", "INFO"))
        return True
    
    def print_summary(self):
        """Print comprehensive test summary"""
        self.log("=" * 60)
        self.log("COMPREHENSIVE TEST SUMMARY")
        self.log("=" * 60)
        
        passed = sum(1 for _, status in self.results if status == "PASS")
        total = len(self.results)
        
        for test_name, status in self.results:
            status_icon = "✅" if status == "PASS" else "⚠️" if status == "WARNING" else "❌"
            self.log(f"{status_icon} {test_name}: {status}")
        
        self.log("=" * 60)
        self.log(f"Overall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 All tests passed! The chatbot system is working correctly.")
        elif passed >= total * 0.8:
            self.log("✅ Most tests passed. The system is working well with minor issues.")
        else:
            self.log("❌ Several tests failed. Please check the configuration and try again.")
        
        self.log("=" * 60)
        self.log("NEXT STEPS:")
        self.log("1. If backend tests failed, check FastAPI server and database connection")
        self.log("2. If frontend tests failed, check Next.js server and browser console")
        self.log("3. For manual testing, visit http://localhost:3000/chat")
        self.log("4. Check database for created sessions and insights")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting comprehensive chatbot system tests...")
        self.log("=" * 60)
        
        # Check environment first
        self.check_environment()
        
        # Find test user
        self.find_test_user()
        
        # Run backend tests
        self.run_backend_tests()
        
        # Run frontend tests
        self.run_frontend_tests()
        
        # Print summary
        self.print_summary()

def main():
    """Main function"""
    print("TrueFi Chatbot Comprehensive Test Runner")
    print("=" * 60)
    
    tester = ComprehensiveTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main() 