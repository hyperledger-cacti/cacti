---
name: codeql-scanning
description: "Analyze code for common vulnerability patterns using CodeQL-style queries. Identify injection flaws, unsafe deserialization, prototype pollution, path traversal, and other security issues in TypeScript/JavaScript code."
---

# CodeQL Scanning Skill

Identify security vulnerability patterns in TypeScript/JavaScript code using
static analysis techniques inspired by CodeQL queries.

## When to Use

- When reviewing code for security vulnerabilities
- Before merging PRs that handle user input or external data
- When auditing authentication, authorization, or crypto code
- When analyzing data flow from sources to sinks

## Vulnerability Patterns

### Injection Flaws (CWE-89, CWE-78, CWE-79)

**SQL Injection**: User input concatenated into SQL queries.
```typescript
// BAD: string concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;
// GOOD: parameterized query
const query = `SELECT * FROM users WHERE id = $1`;
```

**Command Injection**: User input passed to shell commands.
```typescript
// BAD: unsanitized input in exec
exec(`git clone ${repoUrl}`);
// GOOD: use execFile with argument array
execFile("git", ["clone", repoUrl]);
```

**XSS**: User input rendered without escaping in HTML responses.

### Prototype Pollution (CWE-1321)
- `Object.assign` or spread with untrusted objects
- Deep merge utilities without prototype checks
- `__proto__` or `constructor.prototype` in user input

### Unsafe Deserialization (CWE-502)
- `JSON.parse` of untrusted input without schema validation
- `eval` or `Function()` with dynamic input
- YAML/XML parsing without safe mode

### Path Traversal (CWE-22)
- File paths constructed with user input without sanitization
- Missing checks for `../` sequences
- Symlink following without validation

### Insecure Crypto (CWE-327, CWE-330)
- MD5 or SHA1 for password hashing (use bcrypt/scrypt/argon2)
- `Math.random()` for security-sensitive values
- Hardcoded encryption keys or IVs

### SSRF (CWE-918)
- HTTP requests to user-supplied URLs without allowlist
- DNS rebinding exposure
- Internal network access via URL manipulation

### Cacti-Specific Patterns
- **OpenAPI endpoint auth**: Endpoints in `openapi.json` missing security
  scheme definitions.
- **Gateway protocol**: SATP Hermes messages accepted without signature
  verification or session validation.
- **Ledger connector**: Private keys logged or stored insecurely.
- **Test tooling in prod**: `cactus-test-tooling` imported in main source.

## Data Flow Analysis

For each finding, trace the data flow:

1. **Source**: Where does untrusted data enter? (HTTP request, file read,
   environment variable, database query result)
2. **Propagation**: How does the data flow through the code? (variable
   assignment, function parameters, object properties)
3. **Sink**: Where is the data used in a security-sensitive operation?
   (SQL query, shell command, file path, HTTP response)
4. **Sanitizers**: Are there any validation or encoding steps between
   source and sink?

## Output Format

```markdown
## CodeQL-Style Scan: [Package/Scope]

### Findings

#### [CWE-XXX] [Vulnerability Name]
- **Severity**: Critical/High/Medium/Low
- **Source**: [file:line] — [description of data entry point]
- **Sink**: [file:line] — [description of dangerous operation]
- **Flow**: source → [intermediate steps] → sink
- **Sanitizer**: [present/missing]
- **Fix**: [specific remediation steps]

### Summary
- Critical: [count]
- High: [count]
- Medium: [count]
- Low: [count]
```
