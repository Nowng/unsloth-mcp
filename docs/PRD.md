# Product Requirements Document (PRD)

## Unsloth Cloud - Fine-Tuning as a Service

**Version:** 1.0
**Date:** 2025-12-28
**Author:** ScientiaCapital
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement

Organizations want to fine-tune LLMs on their domain data but face:

- **Complexity**: Setting up GPU infrastructure, managing dependencies
- **Cost Opacity**: Unpredictable GPU bills, no budget controls
- **Data Pipeline Gap**: No easy path from raw documents to training data
- **Workflow Friction**: Context-switching between tools

### 1.2 Solution

Unsloth Cloud provides an end-to-end platform for fine-tuning LLMs with:

- One-click fine-tuning with Unsloth's 2x speed advantage
- Integrated knowledge capture (OCR → AI enhancement → training data)
- Real-time cost tracking with budget alerts
- Native MCP integration for Claude Code users

### 1.3 Target Users

| User Type       | Primary Use Case                | Success Metric            |
| --------------- | ------------------------------- | ------------------------- |
| ML Engineers    | Fine-tune models for production | Time to deployed model    |
| Data Scientists | Experiment with model variants  | Experiments per week      |
| Product Teams   | Build AI-powered features       | Feature shipping velocity |
| Researchers     | Reproduce and extend research   | Cost per experiment       |

---

## 2. Feature Requirements

### 2.1 Phase 1: Foundation (Weeks 1-4)

#### F1.1 Authentication System

**Priority:** P0 (Critical)
**Status:** Not Started

##### User Stories

```
As a new user,
I want to sign up with email/password or OAuth,
So that I can access the platform securely.

As a returning user,
I want to log in and see my dashboard,
So that I can continue my work.

As an admin,
I want to manage API keys for programmatic access,
So that I can integrate with CI/CD pipelines.
```

##### Requirements

| ID     | Requirement                      | Acceptance Criteria                         |
| ------ | -------------------------------- | ------------------------------------------- |
| F1.1.1 | Email/password authentication    | User can register, login, reset password    |
| F1.1.2 | OAuth providers (Google, GitHub) | SSO with major providers                    |
| F1.1.3 | API key management               | Create, revoke, rotate API keys             |
| F1.1.4 | Session management               | JWT tokens with 24hr expiry, refresh tokens |
| F1.1.5 | Rate limiting per user           | 100 req/min free, 1000 req/min pro          |

##### Technical Specification

```typescript
// Authentication middleware
interface AuthenticatedUser {
  id: string;
  email: string;
  organization_id: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  permissions: Permission[];
  api_key_hash?: string;
}

// API Key structure
interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  prefix: string; // First 8 chars for identification
  hash: string; // bcrypt hash of full key
  permissions: string[];
  last_used: Date;
  expires_at?: Date;
  created_at: Date;
}
```

##### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  organization_id UUID REFERENCES organizations(id),
  tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  prefix VARCHAR(8) NOT NULL,
  hash VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '["read", "write"]',
  last_used TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

#### F1.2 Multi-Tenancy & Data Isolation

**Priority:** P0 (Critical)
**Status:** Not Started

##### User Stories

```
As a user,
I want my data to be isolated from other users,
So that my proprietary training data is secure.

As an organization admin,
I want to manage team members,
So that my team can collaborate on projects.
```

##### Requirements

| ID     | Requirement             | Acceptance Criteria             |
| ------ | ----------------------- | ------------------------------- |
| F1.2.1 | Tenant isolation        | Each org has separate namespace |
| F1.2.2 | Resource quotas         | Enforce limits per tier         |
| F1.2.3 | Organization management | Create, invite, remove members  |
| F1.2.4 | Role-based access       | Admin, member, viewer roles     |

##### Technical Specification

```typescript
// Tenant context
interface TenantContext {
  organization_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
  quotas: {
    max_jobs_per_month: number;
    max_storage_gb: number;
    max_concurrent_jobs: number;
    allowed_model_sizes: string[];
  };
}

// File path isolation
function getTenantPath(ctx: TenantContext, path: string): string {
  return `/data/${ctx.organization_id}/${path}`;
}

// Checkpoint isolation
function getCheckpointPath(ctx: TenantContext, jobId: string): string {
  return `/data/${ctx.organization_id}/checkpoints/${jobId}`;
}
```

##### Storage Structure

```
/data/
  /{organization_id}/
    /datasets/
      /{dataset_id}/
    /checkpoints/
      /{job_id}/
    /models/
      /{model_id}/
    /exports/
      /{export_id}/
```

---

#### F1.3 Billing Integration

**Priority:** P0 (Critical)
**Status:** Not Started

##### User Stories

```
As a user,
I want to see my current usage and costs,
So that I can manage my budget.

As a paying customer,
I want to upgrade/downgrade my plan,
So that I can adjust based on my needs.

As an enterprise customer,
I want to receive invoices,
So that I can process payment through procurement.
```

##### Requirements

| ID     | Requirement        | Acceptance Criteria                 |
| ------ | ------------------ | ----------------------------------- |
| F1.3.1 | Stripe integration | Subscriptions, usage-based billing  |
| F1.3.2 | Usage metering     | Track GPU hours, storage, API calls |
| F1.3.3 | Plan management    | Upgrade, downgrade, cancel          |
| F1.3.4 | Invoice generation | Monthly invoices for Team+          |
| F1.3.5 | Payment methods    | Card, ACH, wire (enterprise)        |

##### Technical Specification

```typescript
// Usage event for metering
interface UsageEvent {
  organization_id: string;
  user_id: string;
  event_type: 'gpu_hour' | 'storage_gb' | 'api_call' | 'training_job';
  quantity: number;
  metadata: {
    gpu_type?: string;
    model_size?: string;
    job_id?: string;
  };
  timestamp: Date;
}

// Subscription status
interface Subscription {
  organization_id: string;
  stripe_subscription_id: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled';
  current_period_start: Date;
  current_period_end: Date;
  usage_this_period: {
    gpu_hours: number;
    storage_gb: number;
    api_calls: number;
    training_jobs: number;
  };
}
```

##### Stripe Products

```javascript
// Stripe product configuration
const products = {
  pro: {
    price_id: 'price_pro_monthly',
    amount: 4900, // $49.00
    interval: 'month',
    usage_meters: ['gpu_hours', 'storage_gb'],
  },
  team: {
    price_id: 'price_team_monthly',
    amount: 19900, // $199.00
    interval: 'month',
    seats: 5,
    usage_meters: ['gpu_hours', 'storage_gb'],
  },
};

// Usage-based pricing
const usagePricing = {
  free: { gpu_hour: 2.5, storage_gb: 0.1 },
  pro: { gpu_hour: 2.0, storage_gb: 0.08 },
  team: { gpu_hour: 1.75, storage_gb: 0.05 },
  enterprise: 'custom',
};
```

---

### 2.2 Phase 2: Web Dashboard (Weeks 5-8)

#### F2.1 Dashboard UI

**Priority:** P1 (High)
**Status:** Not Started

##### User Stories

```
As a user,
I want to see my active and completed jobs,
So that I can monitor my fine-tuning progress.

As a user,
I want to see my cost summary,
So that I can track spending against my budget.

As a user,
I want to start a new fine-tuning job from the UI,
So that I don't need to use the CLI/API.
```

##### Requirements

| ID     | Requirement        | Acceptance Criteria                     |
| ------ | ------------------ | --------------------------------------- |
| F2.1.1 | Dashboard overview | Active jobs, recent jobs, cost summary  |
| F2.1.2 | Job list view      | Filter, sort, search jobs               |
| F2.1.3 | Job detail view    | Logs, metrics, checkpoints              |
| F2.1.4 | New job wizard     | Model selection, dataset upload, config |
| F2.1.5 | Cost dashboard     | Daily/weekly/monthly breakdown          |

##### Wireframes

```
┌─────────────────────────────────────────────────────────────────┐
│  UNSLOTH CLOUD                    [Docs] [API] [Profile ▼]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Active Jobs │  │ This Month  │  │ Budget      │              │
│  │     3       │  │   $127.50   │  │ 64% used    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  Recent Jobs                              [+ New Job]            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Job ID      │ Model        │ Status    │ Cost   │ Time    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ job_abc123  │ Llama-3.2-1B │ ✅ Done   │ $2.50  │ 15min   │  │
│  │ job_def456  │ Mistral-7B   │ 🔄 Running│ $4.20  │ 32min   │  │
│  │ job_ghi789  │ Llama-3.2-1B │ ⏸ Paused │ $1.00  │ 8min    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

##### Tech Stack

| Component  | Technology   | Rationale                |
| ---------- | ------------ | ------------------------ |
| Framework  | Next.js 14   | SSR, API routes, React   |
| Styling    | Tailwind CSS | Rapid UI development     |
| Components | shadcn/ui    | Accessible, customizable |
| State      | Zustand      | Simple, performant       |
| API Client | tRPC or REST | Type-safe API calls      |
| Hosting    | Vercel       | Easy deployment, edge    |

---

#### F2.2 Job Management

**Priority:** P1 (High)
**Status:** Not Started

##### Requirements

| ID     | Requirement      | Acceptance Criteria                     |
| ------ | ---------------- | --------------------------------------- |
| F2.2.1 | Create job       | Select model, upload dataset, configure |
| F2.2.2 | Monitor job      | Real-time logs, loss charts             |
| F2.2.3 | Pause/resume job | Save state, resume from checkpoint      |
| F2.2.4 | Cancel job       | Stop and cleanup resources              |
| F2.2.5 | Clone job        | Duplicate config for new run            |

##### Job Configuration UI

```typescript
interface JobConfig {
  // Model selection
  base_model: string; // e.g., "unsloth/Llama-3.2-1B"

  // Dataset
  dataset_source: 'upload' | 'huggingface' | 'knowledge_base';
  dataset_id?: string;
  dataset_format: 'alpaca' | 'sharegpt' | 'chatml' | 'custom';

  // Training parameters
  max_seq_length: number; // 512 - 8192
  lora_rank: number; // 8, 16, 32, 64
  lora_alpha: number; // Typically same as rank
  batch_size: number; // 1, 2, 4, 8
  gradient_accumulation: number; // 1, 2, 4, 8, 16
  learning_rate: number; // 1e-5 to 5e-4
  max_steps: number; // 100 - 10000
  warmup_steps: number;

  // Advanced
  load_in_4bit: boolean;
  use_gradient_checkpointing: boolean;

  // Cost controls
  max_budget: number; // Stop if exceeded
  checkpoint_frequency: number; // Save every N steps
}
```

---

### 2.3 Phase 3: Enterprise Features (Weeks 9-16)

#### F3.1 Team Collaboration

**Priority:** P2 (Medium)
**Status:** Not Started

##### Requirements

| ID     | Requirement     | Acceptance Criteria                      |
| ------ | --------------- | ---------------------------------------- |
| F3.1.1 | Team workspaces | Shared projects, models, datasets        |
| F3.1.2 | Role management | Admin, editor, viewer permissions        |
| F3.1.3 | Audit logging   | Track all actions with user attribution  |
| F3.1.4 | SSO/SAML        | Enterprise identity provider integration |

---

#### F3.2 Advanced Security

**Priority:** P2 (Medium)
**Status:** Not Started

##### Requirements

| ID     | Requirement             | Acceptance Criteria         |
| ------ | ----------------------- | --------------------------- |
| F3.2.1 | SOC2 Type II compliance | Pass audit                  |
| F3.2.2 | Data encryption at rest | AES-256 for all stored data |
| F3.2.3 | Network isolation       | VPC peering for enterprise  |
| F3.2.4 | Penetration testing     | Annual third-party pentest  |

---

#### F3.3 SLA & Support

**Priority:** P2 (Medium)
**Status:** Not Started

##### Requirements

| ID     | Requirement                | Acceptance Criteria         |
| ------ | -------------------------- | --------------------------- |
| F3.3.1 | 99.9% uptime SLA           | Measured monthly            |
| F3.3.2 | Priority support queue     | < 1hr response for critical |
| F3.3.3 | Dedicated Slack channel    | Enterprise customers        |
| F3.3.4 | Quarterly business reviews | Enterprise customers        |

---

## 3. API Specification

### 3.1 Authentication

```bash
# API Key authentication
curl -X POST https://api.unsloth.cloud/v1/jobs \
  -H "Authorization: Bearer usk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"model": "unsloth/Llama-3.2-1B", ...}'
```

### 3.2 Endpoints

| Method | Endpoint                    | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/v1/jobs`                  | Create fine-tuning job |
| GET    | `/v1/jobs`                  | List jobs              |
| GET    | `/v1/jobs/{id}`             | Get job details        |
| POST   | `/v1/jobs/{id}/cancel`      | Cancel job             |
| POST   | `/v1/jobs/{id}/resume`      | Resume from checkpoint |
| GET    | `/v1/jobs/{id}/logs`        | Stream job logs        |
| GET    | `/v1/jobs/{id}/checkpoints` | List checkpoints       |
| GET    | `/v1/models`                | List available models  |
| POST   | `/v1/datasets`              | Upload dataset         |
| GET    | `/v1/usage`                 | Get usage summary      |
| GET    | `/v1/costs`                 | Get cost breakdown     |

### 3.3 Request/Response Examples

#### Create Job

```json
// POST /v1/jobs
// Request
{
  "model": "unsloth/Llama-3.2-1B",
  "dataset_id": "ds_abc123",
  "config": {
    "max_seq_length": 2048,
    "lora_rank": 16,
    "batch_size": 2,
    "max_steps": 500,
    "learning_rate": 2e-4
  },
  "budget_limit": 10.00
}

// Response
{
  "id": "job_xyz789",
  "status": "queued",
  "model": "unsloth/Llama-3.2-1B",
  "dataset_id": "ds_abc123",
  "config": { ... },
  "estimated_cost": 3.50,
  "estimated_duration_minutes": 25,
  "created_at": "2025-12-28T10:30:00Z"
}
```

#### Get Job Status

```json
// GET /v1/jobs/job_xyz789
// Response
{
  "id": "job_xyz789",
  "status": "running",
  "progress": {
    "current_step": 150,
    "total_steps": 500,
    "current_loss": 1.234,
    "learning_rate": 0.0002
  },
  "metrics": {
    "gpu_hours_used": 0.5,
    "cost_so_far": 1.0,
    "tokens_processed": 1500000
  },
  "checkpoints": [{ "step": 100, "path": "ckpt_job_xyz789_step100", "loss": 1.456 }],
  "created_at": "2025-12-28T10:30:00Z",
  "started_at": "2025-12-28T10:31:15Z"
}
```

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric                  | Requirement  |
| ----------------------- | ------------ |
| API Response Time (p95) | < 200ms      |
| Job Queue Time          | < 60 seconds |
| Dashboard Load Time     | < 2 seconds  |
| Log Streaming Latency   | < 5 seconds  |

### 4.2 Scalability

| Metric           | Phase 1 | Phase 4 |
| ---------------- | ------- | ------- |
| Concurrent Jobs  | 50      | 1,000   |
| Active Users     | 500     | 10,000  |
| API Requests/sec | 100     | 5,000   |
| Storage (TB)     | 1       | 100     |

### 4.3 Availability

| Metric                         | Target  |
| ------------------------------ | ------- |
| Uptime (monthly)               | 99.9%   |
| RTO (Recovery Time Objective)  | 4 hours |
| RPO (Recovery Point Objective) | 1 hour  |

### 4.4 Security

| Requirement                | Implementation              |
| -------------------------- | --------------------------- |
| Data encryption in transit | TLS 1.3                     |
| Data encryption at rest    | AES-256                     |
| API authentication         | JWT + API Keys              |
| Secret management          | AWS Secrets Manager / Vault |
| Audit logging              | All API calls logged        |

---

## 5. Dependencies

### 5.1 External Services

| Service   | Purpose           | Fallback    |
| --------- | ----------------- | ----------- |
| RunPod    | GPU compute       | Lambda Labs |
| Stripe    | Billing           | Paddle      |
| Supabase  | Database, Auth    | PlanetScale |
| Vercel    | Dashboard hosting | Netlify     |
| Anthropic | AI enhancement    | -           |

### 5.2 Internal Systems

| System             | Dependency Type |
| ------------------ | --------------- |
| Checkpoint Manager | Ready (v2.3.0)  |
| Cost Tracker       | Ready (v2.3.0)  |
| Knowledge Pipeline | Ready (v2.2.0)  |
| RunPod Client      | Ready (v2.2.0)  |

---

## 6. Release Criteria

### 6.1 Phase 1 (Foundation) Release Criteria

- [ ] Authentication working (email + OAuth)
- [ ] API key generation and validation
- [ ] Multi-tenant data isolation verified
- [ ] Stripe subscription flow complete
- [ ] Usage metering accurate (±5%)
- [ ] 95% test coverage on auth/billing
- [ ] Security review passed
- [ ] Load testing: 100 concurrent users

### 6.2 Phase 2 (Dashboard) Release Criteria

- [ ] Dashboard renders in < 2 seconds
- [ ] Job creation wizard functional
- [ ] Real-time log streaming working
- [ ] Cost dashboard accurate
- [ ] Mobile-responsive design
- [ ] Accessibility audit passed (WCAG 2.1 AA)

---

## 7. Open Questions

| Question                                            | Owner    | Due Date | Status |
| --------------------------------------------------- | -------- | -------- | ------ |
| Which OAuth providers to support initially?         | Product  | Week 1   | Open   |
| Should we support team billing or only org billing? | Product  | Week 2   | Open   |
| What's the free tier GPU quota?                     | Business | Week 1   | Open   |
| Do we need HIPAA compliance for Phase 3?            | Legal    | Week 8   | Open   |

---

## 8. Appendices

### Appendix A: Competitive Pricing Comparison

| Feature     | Us (Pro) | Together AI | Predibase | H2O        |
| ----------- | -------- | ----------- | --------- | ---------- |
| Base Price  | $49/mo   | Usage only  | Free tier | Enterprise |
| A100 GPU/hr | $2.00    | $1.75       | ~$2.50    | N/A        |
| Storage/GB  | $0.08    | N/A         | N/A       | N/A        |
| Free Tier   | 10 jobs  | 1M tokens   | 1M tokens | None       |
| Min Commit  | None     | None        | None      | Annual     |

### Appendix B: Model Support Matrix

| Model         | 4-bit | 8-bit | Full | Est. Cost (100 steps) |
| ------------- | ----- | ----- | ---- | --------------------- |
| Llama-3.2-1B  | ✅    | ✅    | ✅   | $0.50                 |
| Llama-3.2-3B  | ✅    | ✅    | ✅   | $1.00                 |
| Mistral-7B    | ✅    | ✅    | ⚠️   | $2.50                 |
| Llama-3.1-8B  | ✅    | ✅    | ⚠️   | $3.00                 |
| Llama-3.3-70B | ✅    | ⚠️    | ❌   | $15.00                |

### Appendix C: Error Codes

| Code                  | HTTP | Description                      |
| --------------------- | ---- | -------------------------------- |
| `auth_required`       | 401  | No authentication provided       |
| `auth_invalid`        | 401  | Invalid API key or token         |
| `quota_exceeded`      | 429  | Plan limit reached               |
| `budget_exceeded`     | 402  | Job budget limit hit             |
| `job_not_found`       | 404  | Job ID doesn't exist             |
| `model_not_available` | 400  | Model not supported on your plan |

---

_Document Version: 1.0 | Last Updated: 2025-12-28_
