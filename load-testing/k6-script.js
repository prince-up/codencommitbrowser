import http from 'k6/http';
import { check, sleep } from 'k6';

// Phase 15: K6 Load Testing Script
// Simulating 1000 concurrent students establishing API connections
export const options = {
  stages: [
    { duration: '30s', target: 500 },  // Ramp up to 500 users
    { duration: '1m', target: 1000 },  // Spike to 1000 users (Exam start time)
    { duration: '1m', target: 1000 },  // Hold at 1000 users
    { duration: '30s', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    // 95% of requests must complete below 200ms
    http_req_duration: ['p(95)<200'], 
    // Failure rate must be less than 1%
    http_req_failed: ['rate<0.01'],   
  },
};

export default function () {
  // Simulating an intensive health check / initial handshake
  const res = http.get('http://localhost:4000/api/health');
  
  check(res, {
    'is status 200': (r) => r.status === 200,
    'latency < 200ms': (r) => r.timings.duration < 200,
  });
  
  // Wait 1 second before the next virtual user request
  sleep(1);
}
