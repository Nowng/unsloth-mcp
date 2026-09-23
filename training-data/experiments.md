# GRPO Fine-Tuning Experiments Log

This file tracks all GRPO training iterations. Each run appends its results here.
Used by Ralph Wiggum loop to understand what's been tried and what to do next.

---

## Configuration Reference

**Model:** Qwen2.5-3B-Instruct
**Method:** GRPO (Group Relative Policy Optimization)
**Dataset:** 30 Coperniq sales prompts
**Success Criteria:**

- Reward mean ≥ 0.75
- Keyword accuracy ≥ 80%
- Length compliance ≥ 90%

---

## Baseline (Before Training)

**Configuration:** N/A (pre-trained model only)

**Results:**

- Reward mean: ~0.45 (estimated)
- Keyword accuracy: ~40%
- Length compliance: ~60%

**Notes:** Base Qwen model has general instruction following but lacks domain-specific sales/MEP knowledge and appropriate response structure.

---

## Pre-Training Enhancement (2025-01-02)

**Changes Made:**

1. **Expanded Training Prompts** (30 → 50 prompts)
   - Added 20 real scenarios from Gong transcripts
   - Categories: greenbox_intro, solarkal_exploration, westtexas_intro, firstchoice_discovery, matcon_intro
   - Source: 169 ChatML examples extracted from 8 Gong calls

2. **Enhanced Reward Function Keywords**
   - Added `MEP_KEYWORDS` (22 terms): mep, contractor, solar, dispatch, route, etc.
   - Added `COPERNIQ_KEYWORDS` (18 terms): workflow, pipeline, stages, hierarchy, sla, blocking, portal, etc.
   - Added `ABDULLAH_DEMO_PHRASES` (11 phrases): "over here", "you can see", "for example", etc.
   - Coperniq-specific terms get bonus scoring

3. **New Sales Technique Signal** (weight: 0.15)
   - Rewards discovery questions, next steps, empathy, competitive positioning, value propositions
   - Based on Abdullah's patterns from 8 recorded calls

4. **Adjusted Length Thresholds**
   - min_length: 50 → 75 (short answers lack depth)
   - max_length: 500 → 600 (allow detailed explanations)
   - target_length: 200 → 250 (match Abdullah's demo style)

**Expected Impact:**

- Better domain-specific responses (MEP/solar/Coperniq terminology)
- More structured, actionable advice
- Responses that sound like Abdullah's winning patterns

---

## Sales Book Integration (2026-01-02)

**Changes Made:**

1. **Added Sales Book Keywords to Reward Function** (5 new keyword lists)
   - `CHRIS_VOSS_KEYWORDS` (17 terms): mirroring, labeling, tactical empathy, calibrated question, accusation audit, black swan, etc.
   - `CHALLENGER_KEYWORDS` (16 terms): challenger, teaching, tailoring, taking control, commercial insight, constructive tension, etc.
   - `JTBD_KEYWORDS` (13 terms): job to be done, outcome, underserved, desired outcome, struggling moment, etc.
   - `BLUE_OCEAN_KEYWORDS` (17 terms): blue ocean, red ocean, value innovation, strategy canvas, uncontested market, noncustomers, etc.
   - `BUSINESS_MODEL_KEYWORDS` (15 terms): value proposition, customer segment, revenue stream, business model canvas, pivot, etc.

2. **Enhanced Keyword Coverage Calculation**
   - Domain keywords (MEP + Coperniq + Abdullah) weighted 60%
   - Methodology keywords (sales books) weighted 40%
   - Coperniq bonus: +0.15 per term
   - Chris Voss + Challenger bonus: +0.1 per term

**Training Data Sources (from data-forge):**
| Source | Samples | Words |
|--------|---------|-------|
| Gong transcripts | 169 | ~50K |
| Never Split the Difference | 101 | 89K |
| The Challenger Sale | 72 | 8.8K |
| Jobs to be Done | 57 | 39K |
| Blue Ocean Strategy | 132 | 80K |
| Business Model Generation | 104 | 66K |
| **Total** | **635** | **~330K** |

**Expected Impact:**

- Responses incorporate proven sales methodology
- Better objection handling using Chris Voss techniques
- More challenger-style commercial insights
- Strategic framing using Blue Ocean concepts

---

<!-- Experiments will be appended below by train_grpo.py -->
