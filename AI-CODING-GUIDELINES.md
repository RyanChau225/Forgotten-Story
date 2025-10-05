# AI Coding Guidelines & Best Practices

> **Purpose:** This document contains mandatory rules and procedures that ALL AI agents must follow when writing, modifying, or reviewing code in this project. These guidelines ensure professional, maintainable, testable, and modular code.

---

## 👨‍🎓 TEACHING MODE (Mandatory for Junior Engineers)

**CRITICAL:** This codebase is maintained by a junior engineer who is actively learning. Every AI agent MUST act as a mentor and teacher, not just a code generator.

### Teaching Rule #1: Always Explain Your Code

**After writing ANY code, AI agents MUST provide:**

1. **Concise Explanation** (2-3 sentences)
   - What does this code do?
   - Why is it structured this way?

2. **Two Alternative Approaches**
   - Show 2 different ways to solve the same problem
   - Explain the tradeoffs of each approach

3. **Why You Chose This Method**
   - What makes this approach best for this situation?
   - What are the pros and cons?

### Teaching Format Template

```markdown
## 📚 Code Explanation

### What I Built
[2-3 sentence explanation of what the code does and why]

### Alternative Approaches

**Approach 1: [Name]**
```typescript
// Code example
```
✅ **Pros:** [List benefits]
❌ **Cons:** [List drawbacks]

**Approach 2: [Name]**
```typescript
// Code example
```
✅ **Pros:** [List benefits]
❌ **Cons:** [List drawbacks]

**Approach 3 (Chosen): [Name]**
```typescript
// The actual code I wrote
```
✅ **Why I chose this:**
- [Reason 1]
- [Reason 2]
- Best fits your needs because: [explanation]

### Key Concepts Used
- **[Concept 1]:** [Brief explanation]
- **[Concept 2]:** [Brief explanation]

### What You Can Learn From This
[One key takeaway the junior engineer should remember]
```

---

### Teaching Rule #2: Use Learning Opportunities

**When introducing new patterns, AI agents MUST:**

❌ **Don't just write code and move on**

✅ **Do teach the pattern:**

```markdown
### Pattern: Dependency Injection

**What it is:** Passing dependencies as parameters instead of hardcoding them.

**Why it matters:** Makes code testable and flexible.

**Example:**
// ❌ Hard to test (hardcoded dependency)
function sendEmail() {
  const api = new SendGridAPI()  // Can't swap this out
  api.send(...)
}

// ✅ Easy to test (injected dependency)
function sendEmail(api: EmailAPI) {
  api.send(...)
}

// Now in tests, you can pass a mock:
sendEmail(mockAPI)  // No real emails sent!

**When to use:** Whenever you call external services (databases, APIs, etc.)
```

---

### Teaching Rule #3: Real-World Examples

**For every new concept, provide:**

1. **The Problem** - What we're trying to solve
2. **The Solution** - How this code solves it
3. **The Lesson** - What pattern/principle this demonstrates

**Example:**

```markdown
### Problem
We need to send test emails without updating the production database's `last_sent` timestamp.

### Solution: Separate Functions Approach
Created two separate functions:
- `send-test-email/` - Sends email, no DB updates
- `send-reminder-emails/` - Sends email, updates DB

### Why This Works
By separating into different files, it's **impossible** to accidentally update production data in test mode. The test function literally doesn't have access to the database update code.

### Lesson: Make Wrong Code Impossible
This demonstrates the principle of "making wrong code impossible to write" - we prevented bugs through architecture, not just careful coding.
```

---

### Teaching Rule #4: Complexity Ratings

**Label code complexity so the junior engineer knows what to study:**

```markdown
### Code Complexity: ⭐⭐⭐☆☆ (Intermediate)

**Prerequisites to understand this:**
- [ ] Understanding of async/await
- [ ] Knowledge of TypeScript interfaces
- [ ] Familiarity with Promises

**New concepts introduced:**
- Dependency injection
- Repository pattern
- Error handling with custom errors

**Study this if you want to learn:** Clean architecture patterns
```

---

### Teaching Rule #5: Common Pitfalls Warning

**Always warn about common mistakes:**

```markdown
### ⚠️ Common Pitfalls to Avoid

1. **Don't forget to handle errors**
   ```typescript
   // ❌ Bad: Error crashes the app
   const user = await db.getUser(id)
   
   // ✅ Good: Error is handled
   try {
     const user = await db.getUser(id)
   } catch (error) {
     return { error: 'User not found' }
   }
   ```

2. **Don't mix concerns**
   - Keep database logic separate from business logic
   - Keep email templates separate from sending logic

3. **Don't hardcode values**
   - Use environment variables for API keys
   - Use constants for magic numbers
```

---

### Teaching Rule #6: Progressive Disclosure

**Explain at the right level:**

**For Simple Code:** Brief explanation only
```typescript
// Simple array filtering - no long explanation needed
const activeUsers = users.filter(u => u.isActive)
```

**For Intermediate Code:** Show alternatives and explain choice
```typescript
// Dependency injection - explain the pattern
function processUser(db: Database) { ... }
```

**For Complex Code:** Full teaching breakdown with examples
```typescript
// Complex: Repository pattern with generics
// Provide full teaching section with examples
```

---

## 📖 Example: Full Teaching Response

**User asks:** "Create a function to get user entries"

**AI Agent Response:**

### ✅ Code Implementation

```typescript
// services/entry-repository.ts
export async function getUserEntries(
  userId: string,
  limit: number = 100
): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .limit(limit)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new DatabaseError(`Failed to fetch entries: ${error.message}`)
  }
  
  return data || []
}
```

### 📚 Code Explanation

**What this does:**
This function fetches a user's journal entries from the database, with the most recent entries first, and includes proper error handling.

### Alternative Approaches

**Approach 1: Direct Supabase Call (No Abstraction)**
```typescript
// In your API route directly:
const { data } = await supabase
  .from('entries')
  .select('*')
  .eq('user_id', userId)

return data
```

✅ **Pros:** 
- Simpler, less code
- Fewer files to manage

❌ **Cons:**
- Can't test without real database
- Error handling duplicated everywhere
- Hard to change database logic later

**Approach 2: Class-Based Repository**
```typescript
class EntryRepository {
  constructor(private db: SupabaseClient) {}
  
  async getUserEntries(userId: string): Promise<Entry[]> {
    // ... implementation
  }
}
```

✅ **Pros:**
- Very organized (all methods in one place)
- Can maintain state if needed
- Common in enterprise applications

❌ **Cons:**
- More boilerplate
- Need to instantiate class everywhere
- Overkill for simple operations

**Approach 3 (Chosen): Functional Repository**
```typescript
export async function getUserEntries(...) { ... }
```

✅ **Why I chose this:**
- **Clean and simple:** Just a function, easy to import and use
- **Testable:** Can mock the supabase client if needed
- **Maintainable:** All database logic in one file (`entry-repository.ts`)
- **TypeScript friendly:** Clear input/output types
- **Best for your project:** Not too complex, not too simple

### Key Concepts Used

**1. Async/Await**
- `async` marks function as asynchronous
- `await` pauses until database returns data
- Cleaner than using `.then()` chains

**2. Error Handling with Throw**
- When database fails, we throw a custom `DatabaseError`
- This lets calling code decide how to handle it
- Better than returning `null` (which could mean "no entries" or "error")

**3. Default Parameters**
- `limit: number = 100` means limit is optional
- If not provided, defaults to 100
- Prevents fetching too many entries accidentally

**4. Type Safety**
- `Promise<Entry[]>` tells TypeScript what this returns
- Catches bugs at compile time, not runtime
- IDE autocomplete works perfectly

### What You Can Learn From This

**Key Takeaway:** 
> "Separate your database logic from your business logic. This function only cares about fetching data - it doesn't know or care about emails, authentication, or UI. This makes it reusable and testable."

**Study further:**
- Repository pattern (this is a simple version)
- Error handling strategies
- Dependency injection (for advanced testing)

### Complexity: ⭐⭐☆☆☆ (Beginner-Intermediate)

**You should understand:**
- Basic async/await syntax
- TypeScript types
- Try/catch error handling

**New concepts:**
- Repository pattern (simplified)
- Custom error types
- Default parameters

---

## 🎯 TEACHING CHECKLIST

**After writing code, AI agents must verify:**

- [ ] Provided 2-3 sentence explanation
- [ ] Showed 2 alternative approaches
- [ ] Explained why I chose this approach
- [ ] Listed key concepts used
- [ ] Included complexity rating
- [ ] Warned about common pitfalls (if applicable)
- [ ] Provided learning takeaway

**For complex code:**
- [ ] Showed before/after examples
- [ ] Explained the pattern/principle
- [ ] Provided real-world analogy if helpful
- [ ] Suggested what to study further

---

## 🚨 CRITICAL RULES (Never Violate These)

### Rule 1: DRY - Don't Repeat Yourself
**If you're about to copy/paste code, STOP and extract it to a shared location first.**

```typescript
// ❌ FORBIDDEN: Duplicating code
// file1.ts
function buildEmailHtml() { /* 200 lines */ }

// file2.ts  
function buildEmailHtml() { /* 200 lines - DUPLICATE */ }

// ✅ REQUIRED: Single source of truth
// shared/email-builder.ts
export function buildEmailHtml() { /* 200 lines */ }

// file1.ts & file2.ts
import { buildEmailHtml } from './shared/email-builder'
```

**AI Agent Checklist Before Writing:**
- [ ] Does similar code exist elsewhere in the codebase?
- [ ] Will this logic need to be reused?
- [ ] If I change this logic later, will I need to update multiple places?
- [ ] If ANY answer is "yes" → Extract to shared utility FIRST

---

### Rule 2: Separation of Concerns
**One file, one responsibility. One function, one purpose.**

```typescript
// ❌ FORBIDDEN: Mixed concerns
async function processUserEmail() {
  // Database access
  const user = await db.query('SELECT * FROM users')
  
  // Business logic
  const isEligible = checkEligibility(user)
  
  // Email formatting
  const html = `<html>...</html>`
  
  // External service
  await sendEmail(html)
  
  // Logging
  console.log('Email sent')
}

// ✅ REQUIRED: Separated concerns
// database.ts
export async function getUser(id: string) { ... }

// business-logic.ts
export function checkEligibility(user: User) { ... }

// email-builder.ts
export function buildEmailHtml(user: User) { ... }

// email-service.ts
export async function sendEmail(to: string, html: string) { ... }

// orchestrator.ts
async function processUserEmail() {
  const user = await getUser(id)
  if (!checkEligibility(user)) return
  const html = buildEmailHtml(user)
  await sendEmail(user.email, html)
}
```

**AI Agent Checklist Before Writing Function:**
- [ ] Does this function do more than one thing? (Count "and" statements)
- [ ] Would I need to open this file to change unrelated features?
- [ ] Can I describe this function in one sentence without "and"?
- [ ] If ANY answer is "yes" → Split into smaller functions

**Separation Guidelines:**
```
lib/           → Business logic, utilities
api/           → HTTP endpoints (thin orchestration only)
services/      → External service integrations
database/      → Data access layer
utils/         → Pure utility functions
shared/        → Code shared between functions
types/         → Type definitions
```

---

### Rule 3: Single Responsibility Principle (SRP)
**A function should have ONE reason to change.**

```typescript
// ❌ FORBIDDEN: Multiple responsibilities
function processOrder(order) {
  // Validation
  if (!order.items) throw new Error()
  
  // Calculation
  const total = order.items.reduce((sum, item) => sum + item.price, 0)
  
  // Database update
  await db.orders.update({ total })
  
  // Email notification
  await sendEmail(order.user.email, 'Order confirmed')
  
  // Logging
  logger.info('Order processed')
}

// ✅ REQUIRED: Single responsibility
function validateOrder(order) { ... }
function calculateTotal(items) { ... }
async function saveOrder(order) { ... }
async function notifyUser(user, message) { ... }

async function processOrder(order) {
  validateOrder(order)
  const total = calculateTotal(order.items)
  await saveOrder({ ...order, total })
  await notifyUser(order.user, 'Order confirmed')
}
```

**AI Agent Mandatory Check:**
- [ ] If I change validation logic, do I need to open this file? 
- [ ] If I change email format, do I need to open this file?
- [ ] If I change database schema, do I need to open this file?
- [ ] If MORE THAN ONE answer is "yes" → Split the function

---

### Rule 4: Make Wrong Code Impossible to Write
**Design architecture so bugs are prevented, not just caught.**

```typescript
// ❌ DANGEROUS: Easy to make mistakes
async function sendEmail(user, options) {
  await emailService.send(user.email)
  
  if (!options.isTest) {  // BUG: Easy to forget this check
    await db.updateLastSent(user.id)
  }
}

// ✅ REQUIRED: Impossible to make mistakes
// send-test-email.ts (separate file)
async function sendTestEmail(user) {
  await emailService.send(user.email)
  // NO database code exists in this file
}

// send-production-email.ts (separate file)
async function sendProductionEmail(user) {
  await emailService.send(user.email)
  await db.updateLastSent(user.id)  // Always happens
}
```

**AI Agent Design Principles:**
- Separate test and production code into different files
- Use TypeScript to prevent invalid states
- Make required parameters explicit (no optional params for critical logic)
- Use enums instead of magic strings/numbers
- Validate at boundaries (API inputs, database outputs)

**Before Writing Code, Ask:**
> "Can a developer accidentally do the wrong thing with this code?"
> If YES → Redesign so the wrong thing is structurally impossible.

---

### Rule 5: Design for Testability
**If code is hard to test, it's badly designed.**

```typescript
// ❌ HARD TO TEST: Hardcoded dependencies
export async function sendReminders() {
  const supabase = createClient(process.env.SUPABASE_URL!)  // Can't mock
  const users = await supabase.from('users').select()        // Hits real DB
  const html = buildEmailHtml(users[0])
  await fetch('https://api.sendgrid.com/send', { ... })     // Hits real API
}

// ✅ EASY TO TEST: Injectable dependencies
export async function sendReminders(
  db: Database,
  emailService: EmailService
) {
  const users = await db.getUsers()
  const html = buildEmailHtml(users[0])
  await emailService.send(html)
}

// Test:
const mockDb = { getUsers: () => [testUser] }
const mockEmail = { send: vi.fn() }
await sendReminders(mockDb, mockEmail)
expect(mockEmail.send).toHaveBeenCalled() ✅
```

**AI Agent Testing Checklist:**
- [ ] Can this function be tested without hitting real database?
- [ ] Can this function be tested without hitting real APIs?
- [ ] Can this function be tested with mock data?
- [ ] Are dependencies passed as parameters (not hardcoded)?
- [ ] If ANY answer is "no" → Refactor for dependency injection

**Testable Code Patterns:**
```typescript
// ✅ Pure functions (easiest to test)
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ✅ Dependency injection
async function processUser(
  user: User,
  db: Database,
  logger: Logger
) { ... }

// ✅ Separate side effects
function prepareEmailData(user: User) { /* pure logic */ }
async function sendEmail(data: EmailData) { /* side effect */ }
```

---

## 📋 MANDATORY PROCEDURES

### Procedure 1: Before Writing ANY New Code

**Step 1: Search for Existing Implementation**
```bash
# AI Agent must run these searches:
grep -r "functionName"
grep -r "similar logic"
# Check: lib/, utils/, shared/, services/
```

**Step 2: Ask Three Questions**
1. "Where does this belong?" (Which directory/file?)
2. "Will I need this exact code elsewhere?" (Extract to shared?)
3. "How will I test this?" (Design for testability?)

**Step 3: Check for Code Duplication**
- If similar code exists → Refactor existing code to be reusable
- If code will be reused → Extract to shared location FIRST
- Only then write new code that imports the shared code

---

### Procedure 2: Code Structure Workflow

```
1. SEARCH: Does this logic exist? 
   ├─ Yes → Reuse or refactor existing
   └─ No → Continue

2. PLAN: Where does this belong?
   ├─ Business logic → lib/
   ├─ API endpoint → api/
   ├─ Data access → database/ or services/
   ├─ Shared utility → utils/ or shared/
   └─ Type definitions → types/

3. DESIGN: What are the responsibilities?
   ├─ More than one? → Split into multiple functions
   ├─ Shared between features? → Extract to shared location
   └─ Single purpose → Implement

4. IMPLEMENT: Write the code
   ├─ Use explicit types (TypeScript)
   ├─ Add JSDoc comments for public functions
   ├─ Keep functions under 50 lines
   └─ Extract magic numbers/strings to constants

5. VERIFY: Self-review checklist
   ├─ [ ] No code duplication?
   ├─ [ ] Single responsibility?
   ├─ [ ] Can be tested easily?
   ├─ [ ] Clear function/variable names?
   ├─ [ ] Error handling added?
   └─ [ ] Types are explicit?
```

---

### Procedure 3: Refactoring Existing Code

**When Modifying Existing Code:**

```typescript
// You find this existing code:
function processUser() {
  // 200 lines of mixed concerns
}

// ❌ FORBIDDEN: Add more code to the mess
function processUser() {
  // 200 lines of mixed concerns
  // + your 50 new lines
}

// ✅ REQUIRED: Refactor FIRST, then add feature
// Step 1: Extract existing code
function validateUser() { ... }
function saveUser() { ... }
function notifyUser() { ... }

// Step 2: Refactor existing
function processUser() {
  validateUser()
  saveUser()
  notifyUser()
}

// Step 3: Now add your feature cleanly
function processUser() {
  validateUser()
  saveUser()
  notifyUser()
  yourNewFeature()  // Clean addition
}
```

**AI Agent Refactoring Rules:**
1. If function > 50 lines → Split into smaller functions
2. If code is duplicated → Extract to shared utility
3. If responsibilities are mixed → Separate concerns
4. Always refactor BEFORE adding new features to messy code

---

### Procedure 4: File Organization

**AI Agent must organize files according to:**

```
project/
├─ lib/                    # Business logic (pure functions when possible)
│  ├─ email-builder.ts     # Email template logic
│  ├─ validation.ts        # Validation logic
│  └─ calculations.ts      # Business calculations
│
├─ services/               # External service integrations
│  ├─ database.ts          # Database client wrapper
│  ├─ email-service.ts     # Email provider API
│  └─ ai-service.ts        # AI API integration
│
├─ utils/                  # Pure utility functions (no side effects)
│  ├─ date-utils.ts        # Date formatting, calculations
│  ├─ string-utils.ts      # String manipulation
│  └─ validators.ts        # Generic validators
│
├─ types/                  # TypeScript type definitions
│  ├─ database.ts          # Database types
│  ├─ api.ts               # API request/response types
│  └─ domain.ts            # Business domain types
│
├─ api/                    # API endpoints (thin layer)
│  └─ users/
│     └─ route.ts          # Orchestrates services, no business logic
│
├─ shared/                 # Code shared between edge functions
│  └─ email-builder.ts     # Shared email templates
│
└─ supabase/functions/     # Edge functions
   ├─ _shared/             # Shared between edge functions only
   ├─ send-email/          
   └─ process-webhook/
```

**Placement Decision Tree:**
```
Is it business logic? → lib/
Is it a utility function? → utils/
Is it an API endpoint? → api/
Is it a type definition? → types/
Is it shared between edge functions? → supabase/functions/_shared/
Is it a service integration? → services/
```

---

## 🎯 CODE QUALITY STANDARDS

### Standard 1: Function Design

**Every function MUST:**
- [ ] Have a clear, descriptive name (verb + noun)
- [ ] Be under 50 lines (if longer, split it)
- [ ] Have a single, well-defined purpose
- [ ] Include JSDoc comment if public/exported
- [ ] Use explicit types (no `any` unless absolutely necessary)
- [ ] Handle errors explicitly

```typescript
// ✅ REQUIRED: Well-designed function
/**
 * Calculates the total price of items including tax and discounts.
 * 
 * @param items - Array of items to calculate total for
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param discount - Optional discount amount to subtract
 * @returns Total price after tax and discounts
 * @throws {ValidationError} If items array is empty
 */
export function calculateTotal(
  items: Item[],
  taxRate: number,
  discount: number = 0
): number {
  if (items.length === 0) {
    throw new ValidationError('Items array cannot be empty')
  }
  
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  const tax = subtotal * taxRate
  return subtotal + tax - discount
}
```

---

### Standard 2: Naming Conventions

**AI Agent MUST use these naming patterns:**

```typescript
// Functions: verb + noun
getUserById()           ✅
validateEmail()         ✅
calculateTotal()        ✅
user()                  ❌ (no verb)
process()               ❌ (no noun)

// Boolean variables/functions: is/has/should/can
isValid                 ✅
hasPermission           ✅
shouldRetry             ✅
valid                   ❌
permission              ❌

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRIES = 3              ✅
const API_BASE_URL = "..."         ✅
const maxRetries = 3               ❌

// Enums: PascalCase with descriptive names
enum UserRole {                    ✅
  Admin = 'admin',
  User = 'user'
}

enum Status { A, B }               ❌ (not descriptive)

// Interfaces/Types: PascalCase, descriptive
interface UserProfile { ... }      ✅
interface EmailData { ... }        ✅
interface Data { ... }             ❌ (too generic)

// Private functions: prefix with underscore (if needed)
function _internalHelper() { ... } ✅
```

---

### Standard 3: Error Handling

**AI Agent MUST handle errors explicitly:**

```typescript
// ❌ FORBIDDEN: Silent failures
async function getUser(id: string) {
  const user = await db.query(id)
  return user  // What if query fails?
}

// ❌ FORBIDDEN: Generic error handling
try {
  await processPayment()
} catch (e) {
  console.log(e)  // User has no idea what happened
}

// ✅ REQUIRED: Explicit error handling
async function getUser(id: string): Promise<User> {
  try {
    const user = await db.query(id)
    
    if (!user) {
      throw new NotFoundError(`User ${id} not found`)
    }
    
    return user
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error
    }
    throw new DatabaseError(`Failed to fetch user: ${error.message}`)
  }
}

// ✅ REQUIRED: Domain-specific errors (use thiserror pattern)
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
```

**Error Handling Rules:**
1. Never swallow errors silently
2. Create domain-specific error types
3. Provide actionable error messages
4. Log errors with context
5. Return user-friendly messages (don't expose internal errors)

---

### Standard 4: TypeScript Usage

**AI Agent MUST:**

```typescript
// ✅ REQUIRED: Explicit types everywhere
function calculateTotal(items: Item[]): number { ... }

// ❌ FORBIDDEN: Any types
function process(data: any): any { ... }

// ✅ REQUIRED: Interfaces for data structures
interface EmailData {
  to: string
  subject: string
  html: string
  from?: string  // Optional fields clearly marked
}

// ✅ REQUIRED: Union types for limited options
type UserRole = 'admin' | 'user' | 'guest'

// ✅ REQUIRED: Enums for related constants
enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  NotFound = 404
}

// ✅ REQUIRED: Type guards for runtime checking
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  )
}
```

---

### Standard 5: Comments and Documentation

**When AI Agent MUST add comments:**

```typescript
// ✅ REQUIRED: JSDoc for public functions/exports
/**
 * Sends a reminder email to users based on their subscription frequency.
 * 
 * @param userId - The ID of the user to send reminder to
 * @returns Promise resolving to send result
 * @throws {NotFoundError} If user not found
 * @throws {EmailError} If email fails to send
 */
export async function sendReminder(userId: string): Promise<SendResult>

// ✅ REQUIRED: Complex logic explanation
// Calculate cutoff date based on frequency:
// - Daily (1): 24 hours ago
// - Weekly (7): 7 days ago  
// - Monthly (30): 30 days ago
const cutoffDate = new Date(now.getTime() - frequency * 24 * 60 * 60 * 1000)

// ✅ REQUIRED: Why, not what
// Use stale-while-revalidate to prevent cold start latency
const data = await fetch(url, { next: { revalidate: 60 } })

// ❌ FORBIDDEN: Obvious comments
// Set i to 0
let i = 0

// ❌ FORBIDDEN: Commented-out code
// const oldFunction = () => { ... }
```

**Comment Guidelines:**
- Explain WHY, not WHAT (code should be self-explanatory)
- Add comments for complex business logic
- Document assumptions and edge cases
- No commented-out code (use git history)
- Keep comments up-to-date when code changes

---

## 🔍 SELF-REVIEW CHECKLIST

**AI Agent MUST complete this checklist before submitting code:**

### Architecture
- [ ] No duplicate code (DRY principle followed)
- [ ] Each file has single responsibility
- [ ] Shared code extracted to appropriate location
- [ ] Code placed in correct directory (lib/, utils/, api/, etc.)

### Functions
- [ ] Each function has single responsibility
- [ ] Functions are under 50 lines
- [ ] Function names are descriptive (verb + noun)
- [ ] Parameters have explicit types
- [ ] Return types are explicit

### Types & Safety
- [ ] No `any` types used (unless absolutely necessary with explanation)
- [ ] All parameters typed
- [ ] All return values typed
- [ ] Enums used for constants
- [ ] Union types used for limited options

### Error Handling
- [ ] All errors handled explicitly
- [ ] Domain-specific error types created
- [ ] Error messages are actionable
- [ ] No silent failures

### Testability
- [ ] Can be tested without real database
- [ ] Can be tested without real external APIs
- [ ] Dependencies injectable (not hardcoded)
- [ ] Pure functions separated from side effects

### Documentation
- [ ] Public functions have JSDoc comments
- [ ] Complex logic has explanatory comments
- [ ] No commented-out code
- [ ] README updated if needed

### Code Quality
- [ ] No magic numbers/strings (use constants)
- [ ] Consistent naming conventions
- [ ] No console.log (use proper logging)
- [ ] Environment variables used for config

---

## 🚀 EXAMPLES: Good vs Bad Code

### Example 1: Email Feature

```typescript
// ❌ BAD: Duplicated code, mixed concerns
// app/api/send-test-email/route.ts
export async function POST() {
  const supabase = createClient()
  const user = await supabase.auth.getUser()
  const entries = await supabase.from('entries').select()
  const entry = entries[Math.floor(Math.random() * entries.length)]
  
  const html = `
    <html>
      <body>
        <h1>${entry.title}</h1>
        <p>${entry.content}</p>
      </body>
    </html>
  `
  
  await fetch('https://api.sendgrid.com/send', {
    method: 'POST',
    body: JSON.stringify({ to: user.email, html })
  })
}

// supabase/functions/send-reminder-emails/index.ts
// ... same code duplicated here ...
```

```typescript
// ✅ GOOD: Shared logic, separated concerns

// lib/email-builder.ts (Single source of truth)
export interface EmailData {
  title: string
  content: string
  date: string
}

export function buildEmailHtml(data: EmailData): string {
  return `
    <html>
      <body>
        <h1>${data.title}</h1>
        <p>${data.content}</p>
        <p>Date: ${data.date}</p>
      </body>
    </html>
  `
}

export function buildEmailSubject(title: string): string {
  const hooks = ['Remember when', 'Looking back at', 'Revisiting']
  const hook = hooks[Math.floor(Math.random() * hooks.length)]
  return `${hook}: ${title}`
}

// services/email-service.ts (External service integration)
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const response = await fetch(process.env.SENDGRID_API_URL!, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.SENDGRID_KEY}` },
    body: JSON.stringify({ to, subject, html })
  })
  
  if (!response.ok) {
    throw new EmailError(`Failed to send email: ${response.statusText}`)
  }
}

// services/database.ts (Data access)
export async function getRandomEntry(userId: string): Promise<Entry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
  
  if (error) throw new DatabaseError(error.message)
  if (!data.length) throw new NotFoundError('No entries found')
  
  return data[Math.floor(Math.random() * data.length)]
}

// app/api/send-test-email/route.ts (Thin orchestration)
export async function POST() {
  const user = await authenticateUser()
  const entry = await getRandomEntry(user.id)
  
  const html = buildEmailHtml(entry)
  const subject = buildEmailSubject(entry.title)
  
  await sendEmail(user.email, subject, html)
  
  return NextResponse.json({ success: true })
}

// supabase/functions/send-reminder-emails/index.ts
import { buildEmailHtml, buildEmailSubject } from '../_shared/email-builder.ts'
import { sendEmail } from '../_shared/email-service.ts'

// ... uses same shared functions, zero duplication
```

---

### Example 2: API Endpoint

```typescript
// ❌ BAD: Fat controller, no separation
export async function POST(request: Request) {
  const body = await request.json()
  
  // Validation in endpoint
  if (!body.email || !body.password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  
  // Business logic in endpoint
  const hashedPassword = await bcrypt.hash(body.password, 10)
  
  // Database in endpoint
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .insert({ email: body.email, password: hashedPassword })
  
  // Email in endpoint
  await fetch('https://api.sendgrid.com/send', { ... })
  
  return NextResponse.json({ success: true })
}
```

```typescript
// ✅ GOOD: Thin controller, separated concerns

// lib/validation.ts
export function validateUserRegistration(data: unknown): UserRegistrationData {
  if (!isObject(data)) {
    throw new ValidationError('Invalid request body')
  }
  
  if (!isValidEmail(data.email)) {
    throw new ValidationError('Invalid email address')
  }
  
  if (!isStrongPassword(data.password)) {
    throw new ValidationError('Password must be at least 8 characters')
  }
  
  return data as UserRegistrationData
}

// lib/auth.ts
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// services/user-service.ts
export async function createUser(
  email: string,
  hashedPassword: string
): Promise<User> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .insert({ email, password: hashedPassword })
    .select()
    .single()
  
  if (error) throw new DatabaseError(error.message)
  return data
}

// services/email-service.ts
export async function sendWelcomeEmail(email: string): Promise<void> {
  const html = buildWelcomeEmailHtml()
  await sendEmail(email, 'Welcome!', html)
}

// app/api/users/register/route.ts (Thin orchestration)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = validateUserRegistration(body)
    
    const hashedPassword = await hashPassword(validatedData.password)
    const user = await createUser(validatedData.email, hashedPassword)
    
    // Fire and forget (don't block response)
    sendWelcomeEmail(user.email).catch(err => 
      logger.error('Welcome email failed', { userId: user.id, error: err })
    )
    
    return NextResponse.json({ user })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    logger.error('User registration failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 📚 DECISION FLOWCHARTS

### Where Should This Code Live?

```
Is it a pure utility function (no side effects)?
├─ Yes → utils/
└─ No ↓

Is it business logic specific to this domain?
├─ Yes → lib/
└─ No ↓

Is it an external service integration?
├─ Yes → services/
└─ No ↓

Is it an API endpoint?
├─ Yes → api/
└─ No ↓

Is it shared between edge functions?
├─ Yes → supabase/functions/_shared/
└─ No → Consider if it should be one of the above
```

### Should I Extract This to Shared Code?

```
Will this exact code be used in multiple places?
├─ Yes → Extract to shared location NOW
└─ No ↓

Might this code be reused in the future?
├─ Yes → Extract to shared location NOW
└─ No ↓

Is this code duplicated elsewhere?
├─ Yes → Refactor existing code to be shared
└─ No → Okay to keep it local
```

### How Should I Split This Function?

```
Is the function > 50 lines?
├─ Yes → Split it
└─ No ↓

Does the function do multiple unrelated things?
├─ Yes → Split by responsibility
└─ No ↓

Can I describe the function without using "and"?
├─ No → Split it
└─ Yes → Function is good size
```

---

## 🎓 LEARNING PATTERNS

### Pattern 1: Repository Pattern (Data Access)

```typescript
// services/user-repository.ts
export class UserRepository {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.db
      .from('users')
      .select()
      .eq('id', id)
      .single()
    
    if (error) throw new DatabaseError(error.message)
    return data
  }
  
  async create(user: NewUser): Promise<User> {
    const { data, error } = await this.db
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) throw new DatabaseError(error.message)
    return data
  }
}
```

### Pattern 2: Service Layer (Business Logic)

```typescript
// lib/user-service.ts
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}
  
  async registerUser(email: string, password: string): Promise<User> {
    // Validation
    validateEmail(email)
    validatePassword(password)
    
    // Business logic
    const hashedPassword = await hashPassword(password)
    
    // Data persistence
    const user = await this.userRepo.create({
      email,
      password: hashedPassword
    })
    
    // Side effects
    await this.emailService.sendWelcomeEmail(user.email)
    
    return user
  }
}
```

### Pattern 3: Dependency Injection

```typescript
// Instead of hardcoding dependencies:
function sendEmail() {
  const supabase = createClient()  // ❌ Hardcoded
  const sendgrid = new SendGrid()  // ❌ Hardcoded
}

// Use dependency injection:
function sendEmail(
  db: Database,
  emailService: EmailService
) {
  // ✅ Can be mocked for testing
  // ✅ Can swap implementations
  // ✅ Clear dependencies
}
```

---

## 🔧 TOOLS AND COMMANDS

### AI Agent Should Suggest

```bash
# Type checking
pnpm tsc --noEmit

# Linting
pnpm eslint . --fix

# Testing
pnpm test
pnpm test:watch

# Code search (before duplicating)
grep -r "functionName" lib/ services/ utils/
```

---

## 📖 FINAL CHECKLIST FOR AI AGENTS

Before marking any task complete, verify:

**Code Quality:**
- [ ] No duplicate code exists
- [ ] Each file has single responsibility
- [ ] Each function has single responsibility
- [ ] Functions are under 50 lines
- [ ] All types are explicit (no `any`)

**Architecture:**
- [ ] Code is in the correct directory
- [ ] Shared code is extracted properly
- [ ] Concerns are separated
- [ ] Dependencies are injectable

**Testing:**
- [ ] Code can be tested without real database
- [ ] Code can be tested without external APIs
- [ ] Pure functions separated from side effects

**Documentation:**
- [ ] Public functions have JSDoc
- [ ] Complex logic has comments
- [ ] Error cases are documented

**Error Handling:**
- [ ] All errors handled explicitly
- [ ] Domain-specific error types used
- [ ] Error messages are actionable

**Professional Standards:**
- [ ] Naming conventions followed
- [ ] No magic numbers/strings
- [ ] Environment variables for config
- [ ] No console.log (use proper logging)

---

## 🎯 SUMMARY: THE AI AGENT MANTRA

Before writing code, recite:

> 1. **Search first** - Does this code exist?
> 2. **Extract shared** - Will this be reused?
> 3. **Separate concerns** - One responsibility per file/function
> 4. **Design for tests** - Can I test without real dependencies?
> 5. **Make wrong code impossible** - Prevent bugs by design

**If in doubt, ask:**
- "Where does this belong?"
- "Is this duplicated?"
- "How will I test this?"
- "Can I describe this in one sentence?"
- "Would I understand this in 6 months?"

---

**END OF GUIDELINES**

These rules are mandatory for all AI agents working on this codebase. Violations should be flagged and corrected immediately.
