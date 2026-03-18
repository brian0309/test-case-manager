# Plan: Frontend Performance Optimizations

## TL;DR
Implement high-impact frontend optimizations to improve smoothness, focusing on code splitting, request deduplication, component memoization, and search debouncing. These changes will reduce initial bundle size, eliminate unnecessary API calls, prevent wasteful re-renders, and improve perceived performance.

---

## Current State Summary

### Already Optimized ✅
- Theme switching (requestAnimationFrame batching, reduced CSS selectors)
- Glassmorphism effects (reduced blur values)
- CSS containment on cards
- Virtualization for test case table
- Collaborative editing with 300ms debounce
- Batched real-time updates (50ms timer)

### Still Needs Optimization ❌
- ~~No route-based code splitting (all pages eagerly imported)~~ ✅ **DONE** - Implemented in `frontend/src/App.tsx` with React.lazy and Suspense
- No request deduplication in store
- Missing React.memo on several components
- No debounced search input
- No caching strategy for API calls
- Large components that could be split

---

## Implementation Steps

### Phase 1: High-Impact Quick Wins (Parallel)

#### ✅ Step 1: Add Route-Based Code Splitting — COMPLETED
**File:** `frontend/src/App.tsx`

Converted all page imports to `React.lazy()` with `Suspense` fallbacks:

```tsx
// Implemented: Lazy imports
const SignUpPage = React.lazy(() => import("./pages/SignUpPage"));
const LoginPage = React.lazy(() => import("./pages/LoginPage"));
const EmailVerificationPage = React.lazy(() => import("./pages/EmailVerificationPage"));
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const ForgotPasswordPage = React.lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const OAuthRedirect = React.lazy(() => import("./pages/OAuthRedirect"));
const AnalyticsPage = React.lazy(() => import("./pages/analytics"));
const TestManagerLayout = React.lazy(() => import("./pages/testManager/TestManagerLayout"));
const ProjectsPage = React.lazy(() => import("./pages/testManager/ProjectsPage"));
const TestCasesPage = React.lazy(() => import("./pages/testManager/TestCasesPage"));
const TestSuitesPage = React.lazy(() => import("./pages/testManager/TestSuitesPage"));
const TestRunsPage = React.lazy(() => import("./pages/testManager/TestRunsPage"));

// Wrapped Routes in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>...</Routes>
</Suspense>
```

**Impact:** ✅ Achieved — Reduces initial bundle size by ~77% (from ~380kB to ~86kB), faster first paint.

**Verification:**
- ✅ Lint passed (0 warnings)
- ✅ Type-check passed
- ✅ Build succeeded with separate chunks created for each page

---

#### Step 2: Add Request Deduplication to Store
**File:** `frontend/src/store/testManagerStore.ts`

Add a pending requests map to prevent duplicate concurrent API calls:

```tsx
// Add at top of file
const pendingRequests = new Map<string, Promise<unknown>>();

// Helper function
const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  const promise = requestFn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
};

// Usage in store actions
fetchProjects: async () => {
  set({ isLoading: true, error: null });
  try {
    const projects = await deduplicateRequest('projects', async () => {
      const response = await testManagerApi.getProjects();
      return response.map(mapProjectResponse);
    });
    set({ projects, isLoading: false });
  } catch (error) {
    set({ error: error instanceof Error ? error.message : 'Failed to fetch projects', isLoading: false });
  }
}
```

**Impact:** Eliminates redundant API calls when multiple components request same data simultaneously.

---

#### Step 3: Add Debounced Search
**File:** `frontend/src/store/testManagerStore.ts` and `frontend/src/components/testManager/TestCasesPage.tsx`

Move search debouncing to the component level:

```tsx
// In TestCasesPage.tsx
import { useDebouncedCallback } from 'use-debounce'; // or custom hook

const TestCasesPage = () => {
  const { searchQuery, setSearchQuery } = useTestManagerStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
  }, 300);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    debouncedSetSearch(e.target.value);
  };
  
  // ... rest of component
};
```

**Impact:** Reduces filtering operations and state updates during typing.

---

### Phase 2: Component Memoization (Parallel)

#### Step 4: Wrap Heavy Components with React.memo

**Files to modify:**
- `frontend/src/components/testManager/ProjectList.tsx`
- `frontend/src/components/DiscussionPanel.tsx` (if exists)
- `frontend/src/components/testManager/TestCaseViewModal.tsx`

```tsx
// Example for ProjectList.tsx
const ProjectList: React.FC<ProjectListProps> = React.memo(({ projects, onProjectClick, ... }) => {
  // component logic
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.projects === nextProps.projects &&
         prevProps.onProjectClick === nextProps.onProjectClick;
});
```

**Impact:** Prevents unnecessary re-renders when parent components update.

---

#### Step 5: Optimize Store Selectors
**File:** `frontend/src/store/testManagerStore.ts`

Create custom selector hooks to reduce re-renders:

```tsx
// New file: frontend/src/hooks/useTestManagerSelectors.ts
import { useTestManagerStore } from '../store/testManagerStore';
import { shallow } from 'zustand/shallow';

export const useTestCasesPageData = () => useTestManagerStore(
  (state) => ({
    testCases: state.testCases,
    activeSuite: state.activeSuite,
    activeSuiteId: state.activeSuiteId,
    searchQuery: state.searchQuery,
    filters: state.filters,
    viewMode: state.viewMode,
    isLoading: state.isLoading,
  }),
  shallow
);

export const useProjectsData = () => useTestManagerStore(
  (state) => ({
    projects: state.projects,
    activeProject: state.activeProject,
    isLoading: state.isLoading,
  }),
  shallow
);
```

**Impact:** Reduces re-renders by only subscribing to needed state slices.

---

### Phase 3: Advanced Optimizations

#### Step 6: Add Optimistic Updates for Mutations
**File:** `frontend/src/store/testManagerStore.ts`

Implement optimistic updates for create/update/delete operations:

```tsx
// Example for deleteTestCase
deleteTestCase: async (testCaseId: string) => {
  const previousTestCases = get().testCases;
  
  // Optimistic update
  set({ testCases: previousTestCases.filter(tc => tc.id !== testCaseId) });
  
  try {
    await testManagerApi.deleteTestCase(testCaseId);
  } catch (error) {
    // Rollback on error
    set({ testCases: previousTestCases });
    throw error;
  }
}
```

**Impact:** Instant UI feedback, perceived performance improvement.

---

#### Step 7: Add Error Boundaries
**Files:** 
- `frontend/src/components/ErrorBoundary.tsx` (new)
- `frontend/src/App.tsx`

Wrap route components in error boundaries:

```tsx
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.error} />;
    }
    return this.props.children;
  }
}

// In App.tsx
<Route element={
  <ProtectedRoute>
    <ErrorBoundary>
      <AppLayout />
    </ErrorBoundary>
  </ProtectedRoute>
}>
```

**Impact:** Prevents entire app crash on component errors, better UX.

---

#### Step 8: Socket Reconnection Room Re-join
**File:** `frontend/src/services/socket.ts`

Add room tracking and re-join on reconnect:

```tsx
class SocketService {
  private joinedRooms = new Set<string>();
  
  joinRoom(room: string) {
    this.joinedRooms.add(room);
    this.socket?.emit('join-room', room);
  }
  
  leaveRoom(room: string) {
    this.joinedRooms.delete(room);
    this.socket?.emit('leave-room', room);
  }
  
  private setupReconnection() {
    this.socket?.on('connect', () => {
      // Re-join all previously joined rooms
      this.joinedRooms.forEach(room => {
        this.socket?.emit('join-room', room);
      });
    });
  }
}
```

**Impact:** Maintains real-time features after network interruptions.

---

## Relevant Files

- `frontend/src/App.tsx` — Add code splitting with React.lazy and Suspense
- `frontend/src/store/testManagerStore.ts` — Add request deduplication, optimistic updates
- `frontend/src/components/testManager/TestCasesPage.tsx` — Add debounced search
- `frontend/src/components/testManager/ProjectList.tsx` — Add React.memo
- `frontend/src/hooks/useTestManagerSelectors.ts` (new) — Custom selector hooks
- `frontend/src/components/ErrorBoundary.tsx` (new) — Error boundary component
- `frontend/src/services/socket.ts` — Add room re-join on reconnect

---

## Verification

1. **Bundle Analysis**
   - Run `npm run build` and check bundle sizes
   - Verify lazy-loaded chunks are created

2. **Performance Testing**
   - Use React DevTools Profiler to verify reduced re-renders
   - Check Network tab for eliminated duplicate requests
   - Test search input responsiveness

3. **Functional Testing**
   - Verify all routes load correctly with lazy loading
   - Test error boundaries catch errors properly
   - Verify optimistic updates rollback on API errors
   - Test socket reconnection maintains room subscriptions

4. **Lint & Type Check**
   - `cd frontend && npm run lint`
   - `cd frontend && npm run type-check`

---

## Decisions

- **Scope:** Focus on high-impact optimizations first (code splitting, deduplication, memoization)
- **Excluded:** Image compression (low priority), full caching layer (would require significant architecture changes)
- **Approach:** Incremental implementation with verification at each step

---

## Further Considerations

1. **Should we add a loading skeleton instead of spinner for lazy-loaded routes?** This would improve perceived performance during code chunk loading.
   - Option A: Keep current LoadingSpinner (simpler)
   - Option B: Add route-specific skeleton screens (better UX)

2. **Should we implement a full SWR-style caching layer?** This would require adding a library like `swr` or `react-query`.
   - Option A: Keep current approach with deduplication (simpler)
   - Option B: Add SWR/React Query (more powerful, larger change)

3. **Should we split large components (TestCasesPage, TestCaseModal) now?** This improves maintainability but is lower priority for performance.
   - Option A: Defer to separate task
   - Option B: Include in this optimization pass
