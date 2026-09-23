# Product Requirements Plan (PRP)

## Unsloth MCP Server - Commercial Edition

**Version:** 1.0
**Date:** 2025-12-28
**Author:** ScientiaCapital
**Status:** Draft

---

## Executive Summary

Transform the Unsloth MCP Server from an open-source tool into a commercial Fine-Tuning-as-a-Service (FTaaS) platform that competes with Together AI, Predibase, and H2O.ai while leveraging unique differentiators: integrated knowledge capture pipeline, MCP/Claude Code integration, and comprehensive cost management.

---

## 1. Market Analysis

### 1.1 Target Market

| Segment                    | Size                | Pain Points                        | Willingness to Pay |
| -------------------------- | ------------------- | ---------------------------------- | ------------------ |
| **AI Startups**            | 10,000+ companies   | GPU costs, complexity              | $100-500/mo        |
| **Enterprise ML Teams**    | 5,000+ teams        | Security, compliance, cost control | $2,000-10,000/mo   |
| **Independent Developers** | 500,000+ devs       | Cost, learning curve               | $0-50/mo           |
| **Research Labs**          | 2,000+ institutions | Reproducibility, collaboration     | $500-2,000/mo      |

### 1.2 Competitive Landscape

| Competitor      | Strengths                             | Weaknesses                            | Our Advantage                        |
| --------------- | ------------------------------------- | ------------------------------------- | ------------------------------------ |
| **Together AI** | Large model selection, no minimums    | No knowledge pipeline, no cost alerts | Knowledge capture, budget management |
| **Predibase**   | LoRAX multi-adapter serving           | Complex pricing, enterprise focus     | Simpler UX, MCP integration          |
| **H2O.ai**      | Enterprise security, Dell partnership | No self-serve, expensive              | Self-serve + enterprise options      |

### 1.3 Market Opportunity

- LLM fine-tuning market: $2.1B in 2025, growing 45% YoY
- 78% of enterprises plan to fine-tune models in 2025
- Average spend: $15,000/year for mid-market, $150,000/year for enterprise
- Gap: No competitor offers integrated knowledge capture → training pipeline

---

## 2. Product Vision

### 2.1 Vision Statement

> "The fastest path from your data to a production-ready fine-tuned model"

### 2.2 Mission

Enable any organization to create domain-specific AI models by providing:

1. **Speed**: 2x faster fine-tuning via Unsloth optimizations
2. **Simplicity**: One-click from data to deployed model
3. **Control**: Full cost visibility and budget management
4. **Integration**: Native Claude Code / MCP workflow

### 2.3 Product Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                    UNSLOTH CLOUD                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│  KNOWLEDGE      │  FINE-TUNING    │  DEPLOYMENT             │
│  CAPTURE        │  ENGINE         │  & SERVING              │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • OCR Pipeline  │ • Unsloth Core  │ • GGUF Export           │
│ • AI Enhancement│ • LoRA/QLoRA    │ • Ollama Push           │
│ • Training Gen  │ • Checkpoints   │ • HuggingFace Hub       │
│ • Quality Review│ • Cost Tracking │ • API Endpoints         │
└─────────────────┴─────────────────┴─────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │      INFRASTRUCTURE       │
              ├───────────────────────────┤
              │ • RunPod GPU Orchestration│
              │ • Multi-tenant Isolation  │
              │ • Usage Metering          │
              │ • Audit Logging           │
              └───────────────────────────┘
```

---

## 3. Go-to-Market Strategy

### 3.1 Phased Rollout

| Phase                   | Timeline    | Focus                             | Revenue Target |
| ----------------------- | ----------- | --------------------------------- | -------------- |
| **Phase 1: Foundation** | Weeks 1-4   | Auth, multi-tenancy, billing      | $0 (beta)      |
| **Phase 2: Launch**     | Weeks 5-8   | Public launch, free tier          | $5K MRR        |
| **Phase 3: Growth**     | Weeks 9-16  | Enterprise features, partnerships | $25K MRR       |
| **Phase 4: Scale**      | Weeks 17-24 | Team collaboration, SLAs          | $100K MRR      |

### 3.2 Pricing Strategy

#### Tier Structure

| Tier           | Price   | Included                                            | Target     |
| -------------- | ------- | --------------------------------------------------- | ---------- |
| **Free**       | $0/mo   | 10 training jobs, 1B models only, community support | Developers |
| **Pro**        | $49/mo  | 100 jobs, all models up to 13B, email support       | Startups   |
| **Team**       | $199/mo | 500 jobs, 70B models, 5 seats, priority support     | SMB        |
| **Enterprise** | Custom  | Unlimited, on-prem option, SLA, dedicated support   | Enterprise |

#### Usage-Based Pricing (on top of tier)

| Resource         | Free     | Pro      | Team      | Enterprise |
| ---------------- | -------- | -------- | --------- | ---------- |
| GPU Hours (A100) | $2.50/hr | $2.00/hr | $1.75/hr  | Custom     |
| Storage (GB/mo)  | $0.10    | $0.08    | $0.05     | Custom     |
| API Calls        | 1K free  | 10K free | 100K free | Unlimited  |

### 3.3 Distribution Channels

1. **Direct (Website)** - Primary channel, self-serve signup
2. **MCP Marketplace** - Listed as Claude Code extension
3. **AWS/GCP/Azure Marketplace** - Enterprise discovery
4. **Partner Channel** - AI consultancies, system integrators

---

## 4. Success Metrics

### 4.1 North Star Metric

**Monthly Active Training Jobs** - Number of fine-tuning jobs completed per month

### 4.2 Key Performance Indicators

| Category        | Metric                  | Phase 1 Target | Phase 4 Target |
| --------------- | ----------------------- | -------------- | -------------- |
| **Acquisition** | Signups/week            | 50             | 500            |
| **Activation**  | First job within 7 days | 40%            | 60%            |
| **Retention**   | Monthly active users    | 30%            | 50%            |
| **Revenue**     | MRR                     | $0             | $100K          |
| **NPS**         | Net Promoter Score      | 30             | 50             |

### 4.3 Technical Metrics

| Metric                  | Target       |
| ----------------------- | ------------ |
| API Uptime              | 99.9%        |
| Job Success Rate        | 95%          |
| Avg Job Start Time      | < 60 seconds |
| Support Response (Pro+) | < 4 hours    |

---

## 5. Risk Assessment

### 5.1 Technical Risks

| Risk                       | Probability | Impact   | Mitigation                                |
| -------------------------- | ----------- | -------- | ----------------------------------------- |
| GPU availability on RunPod | Medium      | High     | Multi-provider strategy (Lambda, Vast.ai) |
| Unsloth breaking changes   | Low         | High     | Pin versions, maintain fork               |
| Security breach            | Low         | Critical | SOC2 compliance, penetration testing      |

### 5.2 Business Risks

| Risk                     | Probability | Impact | Mitigation                                    |
| ------------------------ | ----------- | ------ | --------------------------------------------- |
| Competitor price war     | High        | Medium | Focus on unique features (knowledge pipeline) |
| Slow enterprise adoption | Medium      | High   | Partner with consultancies                    |
| Regulatory changes (AI)  | Medium      | Medium | Compliance-first architecture                 |

### 5.3 Market Risks

| Risk                               | Probability | Impact | Mitigation                            |
| ---------------------------------- | ----------- | ------ | ------------------------------------- |
| Market commoditization             | High        | Medium | Differentiate via UX and integrations |
| Major player entry (OpenAI/Google) | Medium      | High   | Focus on open-source models niche     |

---

## 6. Resource Requirements

### 6.1 Team (Phase 1-2)

| Role                | Count | Focus                      |
| ------------------- | ----- | -------------------------- |
| Full-stack Engineer | 2     | Auth, dashboard, billing   |
| ML Engineer         | 1     | Fine-tuning optimization   |
| DevOps/SRE          | 1     | Infrastructure, security   |
| Product Manager     | 0.5   | Roadmap, customer research |

### 6.2 Infrastructure Costs (Monthly)

| Item                 | Phase 1  | Phase 4     |
| -------------------- | -------- | ----------- |
| RunPod GPU (buffer)  | $500     | $10,000     |
| Supabase (database)  | $25      | $500        |
| Vercel/hosting       | $20      | $200        |
| Monitoring (Datadog) | $0       | $500        |
| **Total**            | **$545** | **$11,200** |

### 6.3 Timeline

```
Week 1-2:   Authentication + API Keys
Week 3-4:   Multi-tenancy + Data Isolation
Week 5-6:   Billing Integration (Stripe)
Week 7-8:   Web Dashboard MVP
Week 9-10:  Public Beta Launch
Week 11-12: Enterprise Features
Week 13-16: Growth + Optimization
```

---

## 7. Dependencies

### 7.1 External Dependencies

| Dependency      | Risk Level | Alternative          |
| --------------- | ---------- | -------------------- |
| RunPod API      | Medium     | Lambda Labs, Vast.ai |
| Stripe          | Low        | Paddle, LemonSqueezy |
| Supabase        | Low        | PlanetScale, Neon    |
| Unsloth Library | Medium     | Maintain fork        |

### 7.2 Internal Dependencies

- Cost tracking system (completed)
- Checkpoint management (completed)
- Knowledge pipeline (completed)
- RunPod integration (completed)

---

## 8. Approval & Sign-off

| Role             | Name | Date | Signature |
| ---------------- | ---- | ---- | --------- |
| Product Lead     |      |      |           |
| Engineering Lead |      |      |           |
| Business Lead    |      |      |           |

---

## Appendix A: Competitive Feature Matrix

| Feature                    | Us      | Together | Predibase | H2O |
| -------------------------- | ------- | -------- | --------- | --- |
| LoRA/QLoRA                 | ✅      | ✅       | ✅        | ✅  |
| Full Fine-tuning           | ✅      | ✅       | ✅        | ✅  |
| Knowledge Capture Pipeline | ✅      | ❌       | ❌        | ❌  |
| OCR → Training Data        | ✅      | ❌       | ❌        | ❌  |
| MCP/Claude Integration     | ✅      | ❌       | ❌        | ❌  |
| Cost Tracking Dashboard    | ✅      | ❌       | Partial   | ❌  |
| Budget Alerts              | ✅      | ❌       | ❌        | ❌  |
| Checkpoint Resume          | ✅      | ❌       | ❌        | ❌  |
| Free Tier                  | ✅      | ✅       | ✅        | ❌  |
| On-Premise Option          | Planned | ❌       | ✅        | ✅  |
| Multi-Adapter Serving      | Planned | ❌       | ✅        | ❌  |

---

## Appendix B: User Personas

### Persona 1: "Startup Steve"

- **Role**: ML Engineer at Series A startup
- **Goals**: Fine-tune models for customer support chatbot
- **Pain Points**: Limited budget, needs fast iteration
- **Needs**: Simple UI, clear pricing, quick results
- **Quote**: "I need to show results to my CEO in 2 weeks"

### Persona 2: "Enterprise Emma"

- **Role**: Head of AI at Fortune 500
- **Goals**: Deploy domain-specific models across organization
- **Pain Points**: Security compliance, vendor management
- **Needs**: SOC2, audit logs, SLA guarantees
- **Quote**: "My legal team needs to approve every vendor"

### Persona 3: "Researcher Rachel"

- **Role**: PhD student at university
- **Goals**: Reproduce and extend research papers
- **Pain Points**: Limited funding, needs reproducibility
- **Needs**: Free tier, experiment tracking, citation support
- **Quote**: "I need to run 50 experiments on a $500 budget"

---

_Document Version: 1.0 | Last Updated: 2025-12-28_
