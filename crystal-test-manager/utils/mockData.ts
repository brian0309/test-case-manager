
import { TestCase, Priority, Status, Project } from '../types';

const testers = [
  { id: 'u1', name: 'Sarah Chen', avatar: 'https://picsum.photos/seed/sarah/64/64' },
  { id: 'u2', name: 'Mike Ross', avatar: 'https://picsum.photos/seed/mike/64/64' },
  { id: 'u3', name: 'Jessica Lee', avatar: 'https://picsum.photos/seed/jessica/64/64' },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Core E-Commerce',
    description: 'Main consumer-facing shopping platform and checkout flow.',
    color: 'bg-blue-500',
    stats: { suites: 12, cases: 145, members: 8 },
    updatedAt: '2023-10-26T09:30:00Z'
  },
  {
    id: 'p2',
    name: 'iOS Mobile App',
    description: 'Native iOS application testing including iPadOS support.',
    color: 'bg-purple-500',
    stats: { suites: 8, cases: 92, members: 5 },
    updatedAt: '2023-10-25T14:20:00Z'
  },
  {
    id: 'p3',
    name: 'Merchant Dashboard',
    description: 'Admin panel for verified merchants to manage inventory.',
    color: 'bg-emerald-500',
    stats: { suites: 15, cases: 210, members: 12 },
    updatedAt: '2023-10-24T11:15:00Z'
  },
  {
    id: 'p4',
    name: 'Payment Gateway',
    description: 'Integration testing for Stripe, PayPal, and crypto payments.',
    color: 'bg-orange-500',
    stats: { suites: 4, cases: 64, members: 3 },
    updatedAt: '2023-10-20T16:45:00Z'
  }
];

// Helper to convert legacy steps to HTML
const createStepsHtml = (steps: { action: string, expectedResult: string }[]) => {
  if (steps.length === 0) return '';
  return `
    <ol>
      ${steps.map(s => `<li><p><strong>Action:</strong> ${s.action}</p><p><em>Expected:</em> ${s.expectedResult}</p></li>`).join('')}
    </ol>
  `;
};

export const mockTestCases: TestCase[] = [
  {
    id: 'TC-101',
    title: 'Verify Login with Valid Credentials',
    priority: Priority.High,
    status: Status.Passed, // Merged status
    lastRun: '2023-10-24T10:30:00Z',
    assignedTester: testers[0],
    suite: 'Authentication',
    area: 'Login Page',
    expectedResult: 'User successfully logs in and is redirected to the dashboard homepage.',
    steps: [
      { id: 's1', action: 'Navigate to login page', expectedResult: 'Login page loads' },
      { id: 's2', action: 'Enter valid username and password', expectedResult: 'Fields populated' },
      { id: 's3', action: 'Click Login button', expectedResult: 'Dashboard appears' }
    ],
    stepsContent: createStepsHtml([
      { action: 'Navigate to login page', expectedResult: 'Login page loads' },
      { action: 'Enter valid username and password', expectedResult: 'Fields populated' },
      { action: 'Click Login button', expectedResult: 'Dashboard appears' }
    ])
  },
  {
    id: 'TC-102',
    title: 'Verify Password Reset Flow',
    priority: Priority.Critical,
    status: Status.Retest,
    lastRun: '2023-10-23T14:15:00Z',
    assignedTester: testers[1],
    suite: 'Authentication',
    area: 'Forgot Password',
    expectedResult: 'Reset link is emailed to user and allows password change.',
    steps: [],
    stepsContent: ''
  },
  {
    id: 'TC-103',
    title: 'Check Checkout Process with Coupon',
    priority: Priority.Medium,
    status: Status.Failed,
    lastRun: '2023-10-20T09:00:00Z',
    assignedTester: testers[2],
    suite: 'Checkout',
    area: 'Cart',
    expectedResult: 'Coupon discount is applied correctly to the total amount.',
    steps: [],
    stepsContent: ''
  },
  {
    id: 'TC-104',
    title: 'Validate Search Functionality',
    priority: Priority.Low,
    status: Status.Draft,
    lastRun: '2023-10-18T11:20:00Z',
    assignedTester: testers[0],
    suite: 'Search',
    area: 'Global Header',
    expectedResult: 'Relevant results appear in the dropdown as user types.',
    steps: [],
    stepsContent: ''
  },
  {
    id: 'TC-105',
    title: 'Profile Image Upload Support',
    priority: Priority.Medium,
    status: Status.PassFixed,
    lastRun: '2023-10-25T16:45:00Z',
    assignedTester: testers[1],
    suite: 'Profile',
    area: 'User Settings',
    steps: [],
    stepsContent: ''
  },
  {
    id: 'TC-106',
    title: 'API Rate Limiting Check',
    priority: Priority.High,
    status: Status.Passed,
    lastRun: '2023-10-25T08:30:00Z',
    assignedTester: testers[2],
    suite: 'Backend',
    area: 'API Gateway',
    steps: [],
    stepsContent: ''
  },
  {
    id: 'TC-107',
    title: 'Dark Mode Toggle Persistence',
    priority: Priority.Low,
    status: Status.Skipped,
    lastRun: '2023-09-15T10:00:00Z',
    assignedTester: testers[0],
    suite: 'UI/UX',
    area: 'Settings',
    steps: [],
    stepsContent: ''
  }
];
