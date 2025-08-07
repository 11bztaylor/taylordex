# TaylorDex Stabilization Strategy

## Technology Decisions & Rationale

After careful analysis, here are the key technology choices that will stabilize TaylorDex without over-engineering:

### 1. API Layer: Simple Fetch Wrapper (Not Axios)
**Decision:** Native fetch with a lightweight wrapper class
**Why:** 
- No additional dependencies (axios adds 50KB)
- Fetch is now mature and well-supported
- Easier to debug and maintain
- Can add interceptors without library overhead

```javascript
// Simple, effective, no dependencies
class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL || process.env.REACT_APP_API_URL || '/api';
  }
  
  async request(endpoint, options = {}) {
    const response = await fetch(this.baseURL + endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new ApiError(response.status, error.message);
    }
    
    return response.json();
  }
}
```

### 2. State Management: React Context + useReducer (Not Redux/Zustand)
**Decision:** Built-in React Context API with useReducer
**Why:**
- Zero additional dependencies
- Sufficient for current app complexity
- Easier onboarding for contributors
- Can migrate to Zustand later if needed

```javascript
// Clean, simple, built-in
const AppContext = createContext();

function appReducer(state, action) {
  switch(action.type) {
    case 'SET_SERVICES':
      return { ...state, services: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  const actions = {
    setServices: (services) => dispatch({ type: 'SET_SERVICES', payload: services }),
    setLoading: (loading) => dispatch({ type: 'SET_LOADING', payload: loading })
  };
  
  return (
    <AppContext.Provider value={{ ...state, ...actions }}>
      {children}
    </AppContext.Provider>
  );
}
```

### 3. Database: PostgreSQL with pg-pool (Not an ORM)
**Decision:** Direct SQL with connection pooling, no ORM
**Why:**
- You already have SQL queries written
- ORMs add complexity and performance overhead
- pg library with pooling solves the immediate problem
- SQL is more transparent and debuggable

```javascript
// Simple pooling, massive stability improvement
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced from 20 - you don't need that many
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simple query wrapper with automatic release
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Query took', duration, 'ms');
  return res;
}
```

### 4. Error Handling: Boundaries + Consistent Responses (Not Sentry Yet)
**Decision:** React Error Boundaries + Standardized API responses
**Why:**
- Fixes immediate stability issues
- No external service dependencies
- Can add Sentry later when stable
- Simple to implement today

### 5. Testing: Jest + Supertest (Not Cypress/Playwright Yet)
**Decision:** Start with API tests using Supertest
**Why:**
- Backend stability is more critical than UI
- Faster to write and run
- Better ROI for initial effort
- Can add E2E tests once stable

```javascript
// Start with simple API tests
describe('GET /api/services', () => {
  it('returns services list', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
```

### 6. Authentication: Simplify Existing (Not Replace)
**Decision:** Keep JWT, remove unused RBAC complexity
**Why:**
- Current auth works, just over-engineered
- Removing code is safer than rewriting
- Can add back RBAC when actually needed
- Reduces code by ~200 lines

## Implementation Priority

### Week 1: Stop the Bleeding
These four changes will eliminate 90% of stability issues:

#### Day 1-2: API Abstraction
- Create `/frontend/src/api/client.js`
- Migrate 5 critical components
- Test with different backend URL

#### Day 3: Error Boundaries
- Wrap all major component sections
- Add fallback UI
- Log errors to backend

#### Day 4: Database Pooling
- Replace single connection with pool
- Add connection error retry
- Test with load

#### Day 5: Standardize Responses
- Create response utility
- Update 5 most-used endpoints
- Update frontend to handle

### Week 2: Consolidate Gains
#### Day 6-7: State Management
- Implement AppContext
- Move services state to context
- Remove prop drilling from ServiceCard components

#### Day 8-9: Service Standardization
- Create ServiceFactory
- Migrate Radarr and Sonarr (most complex)
- Document pattern for others

#### Day 10: Testing Foundation
- Set up Jest
- Write 10 critical API tests
- Add to CI pipeline

### Week 3: Build Momentum
- Complete API client migration (all components)
- Standardize all service modules
- Add error boundaries throughout
- Achieve 30% test coverage on backend

### Week 4: Polish
- Remove unused RBAC code
- Optimize database queries
- Add caching for stats
- Document everything

## What We're NOT Doing (And Why)

### Not Using TypeScript Yet
**Why:** Adding types while fixing structural issues doubles the work. Fix structure first, add types later.

### Not Using Microservices
**Why:** Your monolith is fine. Microservices would add complexity you don't need.

### Not Using GraphQL
**Why:** REST is simpler and sufficient for your needs. Don't fix what isn't broken.

### Not Using Kubernetes
**Why:** Docker Compose is perfect for your scale. K8s is massive overkill.

### Not Building a Plugin System Yet
**Why:** Get stable first. Plugins add complexity. You have maybe 10 users, not 10,000.

## Success Metrics

### Week 1 Success
- [ ] Zero frontend crashes from API changes
- [ ] Zero "white screen of death" errors
- [ ] Database handles 50 concurrent requests
- [ ] All errors return consistent format

### Week 2 Success
- [ ] Component errors isolated (don't cascade)
- [ ] No prop drilling in main components
- [ ] 10 passing backend tests
- [ ] Services follow standard pattern

### Month 1 Success
- [ ] 30% test coverage
- [ ] < 5 bugs per week
- [ ] < 200ms average API response
- [ ] Zero hardcoded URLs or secrets

## Code Patterns to Enforce

### Always Use Try-Catch in Async Functions
```javascript
// ✅ GOOD
async function getServices() {
  try {
    const result = await db.query('SELECT * FROM services');
    return { success: true, data: result.rows };
  } catch (error) {
    logger.error('Failed to get services:', error);
    return { success: false, error: 'Failed to load services' };
  }
}

// ❌ BAD
async function getServices() {
  const result = await db.query('SELECT * FROM services');
  return result.rows;
}
```

### Always Return Consistent API Responses
```javascript
// ✅ GOOD
res.json({
  success: true,
  data: services,
  meta: { count: services.length }
});

// ❌ BAD
res.json(services);
```

### Always Use Environment Variables
```javascript
// ✅ GOOD
const apiUrl = process.env.RADARR_URL || 'http://localhost:7878';

// ❌ BAD
const apiUrl = 'http://192.168.1.100:7878';
```

### Always Handle Loading States
```javascript
// ✅ GOOD
function ServiceList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  return <ServiceCards services={services} />;
}

// ❌ BAD
function ServiceList() {
  const [services, setServices] = useState([]);
  return <ServiceCards services={services} />;
}
```

## Monitoring Progress

### Daily Checks
```bash
# Check error rate
docker-compose logs backend | grep -c ERROR

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/health

# Check for hardcoded values
grep -r "localhost:5000" frontend/src/
grep -r "localhost:" backend/src/
```

### Weekly Review
- Count bugs reported vs fixed
- Measure test coverage increase
- Review error logs for patterns
- Check performance metrics

## The 80/20 Rule

Focus on the 20% of changes that will fix 80% of problems:

### The Critical 20%
1. API abstraction layer (fixes frontend brittleness)
2. Error boundaries (prevents cascade failures)
3. Database pooling (fixes connection issues)
4. Consistent error handling (predictable failures)

### The Nice-to-Have 80%
- TypeScript migration
- Full test coverage
- Advanced monitoring
- Plugin architecture
- Performance optimizations

## Final Recommendations

### Do This
1. Start with API client - biggest immediate impact
2. Add error boundaries - prevents total failures
3. Fix database pooling - stops connection errors
4. Standardize responses - predictable behavior
5. Simplify what exists - don't add complexity

### Don't Do This
1. Don't rewrite from scratch
2. Don't add new technologies while fixing
3. Don't over-engineer solutions
4. Don't skip error handling
5. Don't deploy without testing

### Remember
- Stability over features
- Simplicity over cleverness
- Working over perfect
- Progress over paralysis

---

*This strategy prioritizes practical fixes over theoretical perfection. Follow it sequentially for maximum stability gains with minimum effort.*