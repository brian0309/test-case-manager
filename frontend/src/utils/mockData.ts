
import { TestCase, Priority, Status, Project } from '../types/testManager';

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
        ownerId: 'u1',
        members: [{ id: 'u1', name: 'Sarah Chen', email: 'sarah@example.com' }],
        stats: { suites: 12, cases: 145, members: 8 },
        updatedAt: '2023-10-26T09:30:00Z'
    },
    {
        id: 'p2',
        name: 'iOS Mobile App',
        description: 'Native iOS application testing including iPadOS support.',
        color: 'bg-purple-500',
        ownerId: 'u2',
        members: [{ id: 'u2', name: 'Mike Ross', email: 'mike@example.com' }],
        stats: { suites: 8, cases: 92, members: 5 },
        updatedAt: '2023-10-25T14:20:00Z'
    },
    {
        id: 'p3',
        name: 'Merchant Dashboard',
        description: 'Admin panel for verified merchants to manage inventory.',
        color: 'bg-emerald-500',
        ownerId: 'u3',
        members: [{ id: 'u3', name: 'Jessica Lee', email: 'jessica@example.com' }],
        stats: { suites: 15, cases: 210, members: 12 },
        updatedAt: '2023-10-24T11:15:00Z'
    },
    {
        id: 'p4',
        name: 'Payment Gateway',
        description: 'Integration testing for Stripe, PayPal, and crypto payments.',
        color: 'bg-orange-500',
        ownerId: 'u1',
        members: [{ id: 'u1', name: 'Sarah Chen', email: 'sarah@example.com' }],
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
        lastModified: '2023-10-24T10:30:00Z',
        assignedTester: testers[0],
        suite: 'Authentication',
        suiteId: 'suite-auth-1',
        area: 'Login Page',
        expectedResult: 'User successfully logs in and is redirected to the dashboard homepage.',
        projectId: 'p1',
        order: 0,
        steps: [
            { id: 's1', action: 'Navigate to login page', expectedResult: 'Login page loads' },
            { id: 's2', action: 'Enter valid username and password', expectedResult: 'Fields populated' },
            { id: 's3', action: 'Click Login button', expectedResult: 'Dashboard appears' }
        ],
        stepsContent: createStepsHtml([
            { action: 'Navigate to login page', expectedResult: 'Login page loads' },
            { action: 'Enter valid username and password', expectedResult: 'Fields populated' },
            { action: 'Click Login button', expectedResult: 'Dashboard appears' }
        ]),
        history: [
            {
                id: 'h1',
                timestamp: '2023-10-23T09:15:00Z',
                user: testers[1],
                snapshot: {
                    title: 'Verify Login Flow',
                    priority: Priority.Medium,
                    status: Status.Draft
                },
                changedFields: ['Title', 'Priority']
            },
            {
                id: 'h2',
                timestamp: '2023-10-22T14:30:00Z',
                user: testers[0],
                snapshot: {
                    title: 'Test User Login',
                    priority: Priority.Low,
                    status: Status.Draft
                },
                changedFields: ['Title', 'Priority', 'Status']
            }
        ]
    },
    {
        id: 'TC-102',
        title: 'Verify Password Reset Flow',
        priority: Priority.Critical,
        status: Status.Passed,
        lastModified: '2023-10-23T14:15:00Z',
        assignedTester: testers[1],
        suite: 'Authentication',
        area: 'Forgot Password',
        expectedResult: 'Reset link is emailed to user and allows password change.',
        projectId: 'p1',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-103',
        title: 'Check Checkout Process with Coupon',
        priority: Priority.Medium,
        status: Status.Failed,
        lastModified: '2023-10-20T09:00:00Z',
        assignedTester: testers[2],
        suite: 'Checkout',
        area: 'Cart',
        expectedResult: 'Coupon discount is applied correctly to the total amount.',
        projectId: 'p1',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-104',
        title: 'Validate Search Functionality',
        priority: Priority.Low,
        status: Status.Skipped,
        lastModified: '2023-10-18T11:20:00Z',
        assignedTester: testers[0],
        suite: 'Search',
        area: 'Global Header',
        expectedResult: 'Relevant results appear in the dropdown as user types.',
        projectId: 'p2',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-105',
        title: 'Profile Image Upload Support',
        priority: Priority.Medium,
        status: Status.Passed,
        lastModified: '2023-10-25T16:45:00Z',
        assignedTester: testers[1],
        suite: 'Profile',
        area: 'User Settings',
        projectId: 'p2',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-106',
        title: 'API Rate Limiting Check',
        priority: Priority.High,
        status: Status.Passed,
        lastModified: '2023-10-25T08:30:00Z',
        assignedTester: testers[2],
        suite: 'Backend',
        area: 'API Gateway',
        projectId: 'p3',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-107',
        title: 'Dark Mode Toggle Persistence',
        priority: Priority.Low,
        status: Status.Skipped,
        lastModified: '2023-09-15T10:00:00Z',
        assignedTester: testers[0],
        suite: 'UI/UX',
        area: 'Settings',
        projectId: 'p4',
        steps: [],
        stepsContent: ''
    },
    // Additional test cases for better suite variety
    {
        id: 'TC-108',
        title: 'Product Image Gallery Navigation',
        priority: Priority.Medium,
        status: Status.Passed,
        lastModified: '2023-10-26T15:20:00Z',
        assignedTester: testers[1],
        suite: 'Product Display',
        area: 'Product Page',
        projectId: 'p1',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-109',
        title: 'Add to Cart Animation',
        priority: Priority.Low,
        status: Status.Draft,
        lastModified: '2023-10-25T11:30:00Z',
        assignedTester: testers[2],
        suite: 'Checkout',
        area: 'Cart',
        projectId: 'p1',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-110',
        title: 'Email Verification Flow',
        priority: Priority.Critical,
        status: Status.Passed,
        lastModified: '2023-10-24T08:45:00Z',
        assignedTester: testers[0],
        suite: 'Authentication',
        area: 'Registration',
        projectId: 'p1',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-111',
        title: 'Push Notification Settings',
        priority: Priority.High,
        status: Status.Passed,
        lastModified: '2023-10-25T13:10:00Z',
        assignedTester: testers[1],
        suite: 'Notifications',
        area: 'Settings',
        projectId: 'p2',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-112',
        title: 'Offline Mode Data Sync',
        priority: Priority.Critical,
        status: Status.Retest,
        lastModified: '2023-10-24T16:00:00Z',
        assignedTester: testers[2],
        suite: 'Offline Support',
        area: 'Data Management',
        projectId: 'p2',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-113',
        title: 'Biometric Authentication',
        priority: Priority.High,
        status: Status.Passed,
        lastModified: '2023-10-26T10:15:00Z',
        assignedTester: testers[0],
        suite: 'Security',
        area: 'Login',
        projectId: 'p2',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-114',
        title: 'Inventory Bulk Upload CSV',
        priority: Priority.High,
        status: Status.Failed,
        lastModified: '2023-10-23T14:30:00Z',
        assignedTester: testers[1],
        suite: 'Inventory Management',
        area: 'Import/Export',
        projectId: 'p3',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-115',
        title: 'Sales Report Generation',
        priority: Priority.Medium,
        status: Status.Passed,
        lastModified: '2023-10-24T09:20:00Z',
        assignedTester: testers[2],
        suite: 'Reporting',
        area: 'Analytics',
        projectId: 'p3',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-116',
        title: 'Customer Order Management',
        priority: Priority.High,
        status: Status.Retest,
        lastModified: '2023-10-25T10:45:00Z',
        assignedTester: testers[0],
        suite: 'Order Processing',
        area: 'Orders',
        projectId: 'p3',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-117',
        title: 'Stripe Payment Integration',
        priority: Priority.Critical,
        status: Status.Passed,
        lastModified: '2023-10-20T14:15:00Z',
        assignedTester: testers[1],
        suite: 'Payment Processing',
        area: 'Stripe',
        projectId: 'p4',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-118',
        title: 'PayPal Express Checkout',
        priority: Priority.High,
        status: Status.Passed,
        lastModified: '2023-10-20T15:30:00Z',
        assignedTester: testers[2],
        suite: 'Payment Processing',
        area: 'PayPal',
        projectId: 'p4',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-119',
        title: 'Cryptocurrency Payment Flow',
        priority: Priority.Medium,
        status: Status.Draft,
        lastModified: '2023-10-19T11:00:00Z',
        assignedTester: testers[0],
        suite: 'Payment Processing',
        area: 'Crypto',
        projectId: 'p4',
        steps: [],
        stepsContent: ''
    },
    {
        id: 'TC-120',
        title: 'Refund Processing Workflow',
        priority: Priority.High,
        status: Status.Passed,
        lastModified: '2023-10-20T13:45:00Z',
        assignedTester: testers[1],
        suite: 'Refunds',
        area: 'Customer Support',
        projectId: 'p4',
        steps: [],
        stepsContent: ''
    }
];
