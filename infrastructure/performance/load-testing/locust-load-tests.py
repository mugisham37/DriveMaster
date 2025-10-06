#!/usr/bin/env python3
"""
Locust Load Testing Script for Adaptive Learning Platform
Comprehensive performance testing with realistic user behavior simulation
"""

import json
import random
import time
from typing import Dict, List, Optional

from locust import HttpUser, task, between, events
from locust.contrib.fasthttp import FastHttpUser


class AdaptiveLearningUser(FastHttpUser):
    """Simulates a realistic user of the adaptive learning platform"""
    
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.session_id: Optional[str] = None
        self.current_items: List[Dict] = []
        self.mastery_levels: Dict[str, float] = {}
        
    def on_start(self):
        """Called when a user starts - authenticate and initialize session"""
        self.authenticate()
        self.start_session()
        
    def on_stop(self):
        """Called when a user stops - clean up session"""
        if self.session_id:
            self.end_session()
    
    def authenticate(self):
        """Authenticate user and get JWT token"""
        credentials = {
            "email": f"loadtest{random.randint(1, 10000)}@example.com",
            "password": "testpassword123"
        }
        
        with self.client.post("/auth/login", json=credentials, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.user_id = data.get("user_id")
                response.success()
            else:
                response.failure(f"Authentication failed: {response.status_code}")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token"""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    def start_session(self):
        """Start a new learning session"""
        if not self.token:
            return
            
        session_data = {
            "session_type": random.choice(["practice", "review", "mock_test"]),
            "target_duration": random.randint(300, 1800)  # 5-30 minutes
        }
        
        with self.client.post("/api/sessions/start", 
                            json=session_data, 
                            headers=self.get_headers(),
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.session_id = data.get("session_id")
                response.success()
            else:
                response.failure(f"Session start failed: {response.status_code}")
    
    @task(10)
    def get_next_items(self):
        """Get next items to practice (most frequent task)"""
        if not self.token or not self.session_id:
            return
            
        params = {
            "count": random.randint(1, 5),
            "session_id": self.session_id
        }
        
        with self.client.get("/api/scheduler/next-items",
                           params=params,
                           headers=self.get_headers(),
                           name="get_next_items",
                           catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.current_items = data.get("items", [])
                
                # Validate response time (critical requirement)
                if response.elapsed.total_seconds() > 0.3:
                    response.failure(f"Response too slow: {response.elapsed.total_seconds():.3f}s")
                else:
                    response.success()
            else:
                response.failure(f"Get next items failed: {response.status_code}")
    
    @task(8)
    def submit_attempt(self):
        """Submit an attempt for a practice item"""
        if not self.current_items or not self.token:
            return
            
        item = random.choice(self.current_items)
        
        # Simulate realistic response patterns
        correct_probability = 0.7  # 70% correct rate
        is_correct = random.random() < correct_probability
        
        # Simulate response time based on difficulty and correctness
        base_time = random.randint(5000, 30000)  # 5-30 seconds
        if not is_correct:
            base_time += random.randint(5000, 15000)  # Longer for incorrect
            
        attempt_data = {
            "item_id": item["id"],
            "session_id": self.session_id,
            "selected": self._generate_answer(item, is_correct),
            "correct": is_correct,
            "time_taken_ms": base_time,
            "quality": self._calculate_quality(is_correct, base_time),
            "confidence": random.randint(1, 5),
            "hints_used": random.randint(0, 2) if not is_correct else 0
        }
        
        with self.client.post("/api/scheduler/attempts",
                            json=attempt_data,
                            headers=self.get_headers(),
                            name="submit_attempt",
                            catch_response=True) as response:
            if response.status_code == 200:
                # Update local mastery tracking
                for topic in item.get("topics", []):
                    current_mastery = self.mastery_levels.get(topic, 0.5)
                    if is_correct:
                        self.mastery_levels[topic] = min(1.0, current_mastery + 0.1)
                    else:
                        self.mastery_levels[topic] = max(0.0, current_mastery - 0.05)
                
                response.success()
            else:
                response.failure(f"Submit attempt failed: {response.status_code}")
    
    @task(3)
    def get_user_progress(self):
        """Check user progress and mastery levels"""
        if not self.token:
            return
            
        with self.client.get("/api/users/progress",
                           headers=self.get_headers(),
                           name="get_user_progress",
                           catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                if "mastery" in data and "progress_summary" in data:
                    response.success()
                else:
                    response.failure("Invalid progress response structure")
            else:
                response.failure(f"Get progress failed: {response.status_code}")
    
    @task(2)
    def get_content_item(self):
        """Retrieve content for a specific item"""
        if not self.current_items:
            return
            
        item = random.choice(self.current_items)
        
        with self.client.get(f"/api/content/items/{item['id']}",
                           headers=self.get_headers(),
                           name="get_content_item",
                           catch_response=True) as response:
            if response.status_code == 200:
                # Validate response time for content delivery
                if response.elapsed.total_seconds() > 0.1:
                    response.failure(f"Content delivery too slow: {response.elapsed.total_seconds():.3f}s")
                else:
                    response.success()
            else:
                response.failure(f"Get content failed: {response.status_code}")
    
    @task(1)
    def search_content(self):
        """Search for content items"""
        search_terms = ["traffic", "speed", "parking", "signs", "rules"]
        term = random.choice(search_terms)
        
        params = {
            "q": term,
            "limit": 10,
            "jurisdiction": "US"
        }
        
        with self.client.get("/api/content/search",
                           params=params,
                           headers=self.get_headers(),
                           name="search_content",
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Content search failed: {response.status_code}")
    
    def _generate_answer(self, item: Dict, is_correct: bool) -> List[str]:
        """Generate a realistic answer for an item"""
        choices = item.get("choices", ["A", "B", "C", "D"])
        correct_answer = item.get("correct", ["A"])
        
        if is_correct:
            return correct_answer
        else:
            # Return a random incorrect answer
            incorrect_choices = [c for c in choices if c not in correct_answer]
            return [random.choice(incorrect_choices)] if incorrect_choices else correct_answer
    
    def _calculate_quality(self, is_correct: bool, response_time: int) -> int:
        """Calculate SM-2 quality score based on correctness and response time"""
        if not is_correct:
            return random.randint(0, 2)
        
        # Correct answers: quality based on response time
        if response_time < 10000:  # Very fast
            return 5
        elif response_time < 20000:  # Fast
            return 4
        else:  # Slow but correct
            return 3
    
    def end_session(self):
        """End the current learning session"""
        if not self.session_id or not self.token:
            return
            
        session_data = {
            "session_id": self.session_id,
            "end_reason": "completed"
        }
        
        with self.client.post("/api/sessions/end",
                            json=session_data,
                            headers=self.get_headers(),
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Session end failed: {response.status_code}")


class AdminUser(FastHttpUser):
    """Simulates administrative users accessing dashboards and reports"""
    
    wait_time = between(5, 15)  # Longer wait times for admin tasks
    weight = 1  # Lower weight - fewer admin users
    
    def on_start(self):
        self.authenticate_admin()
    
    def authenticate_admin(self):
        """Authenticate as admin user"""
        credentials = {
            "email": "admin@example.com",
            "password": "adminpassword123"
        }
        
        with self.client.post("/auth/login", json=credentials, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                response.success()
            else:
                response.failure(f"Admin authentication failed: {response.status_code}")
    
    def get_headers(self) -> Dict[str, str]:
        """Get headers with admin authentication token"""
        headers = {"Content-Type": "application/json"}
        if hasattr(self, 'token') and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    @task(3)
    def view_analytics_dashboard(self):
        """View analytics dashboard"""
        with self.client.get("/api/analytics/dashboard",
                           headers=self.get_headers(),
                           name="analytics_dashboard",
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Analytics dashboard failed: {response.status_code}")
    
    @task(2)
    def export_user_data(self):
        """Export user data (GDPR compliance test)"""
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "format": "csv"
        }
        
        with self.client.get("/api/admin/export/users",
                           params=params,
                           headers=self.get_headers(),
                           name="export_user_data",
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"User data export failed: {response.status_code}")
    
    @task(1)
    def system_health_check(self):
        """Check system health and metrics"""
        with self.client.get("/api/admin/health",
                           headers=self.get_headers(),
                           name="system_health",
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")


# Event handlers for custom metrics and logging
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Log performance metrics for analysis"""
    if exception:
        print(f"Request failed: {name} - {exception}")
    elif response_time > 300:  # Log slow requests
        print(f"Slow request: {name} - {response_time:.2f}ms")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Initialize test environment"""
    print("Starting Adaptive Learning Platform load test...")
    print(f"Target host: {environment.host}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Clean up after test completion"""
    print("Load test completed.")
    
    # Print summary statistics
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Failed requests: {stats.total.num_failures}")
    print(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    print(f"95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")


# Custom user classes for different load patterns
class LearnerUser(AdaptiveLearningUser):
    """Regular learner user - highest volume"""
    weight = 10


class PowerUser(AdaptiveLearningUser):
    """Power user with more intensive usage"""
    weight = 3
    wait_time = between(0.5, 2)  # Faster interactions


class CasualUser(AdaptiveLearningUser):
    """Casual user with slower, less frequent interactions"""
    weight = 5
    wait_time = between(3, 10)  # Slower interactions