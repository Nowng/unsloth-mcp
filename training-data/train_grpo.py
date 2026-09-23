#!/usr/bin/env python3
"""
GRPO Fine-Tuning Script for Coperniq Sales Agent

GRPO (Group Relative Policy Optimization) trains the model by:
1. Generating multiple responses to each prompt
2. Scoring each response with a reward function
3. Learning to prefer higher-reward responses

This script is designed for iterative improvement via Ralph Wiggum loops.
Configuration is loaded from grpo_config.yaml, which Ralph updates each iteration.

Usage:
    python train_grpo.py                    # Use config defaults
    python train_grpo.py --iteration 3      # Resume from specific iteration
"""

import json
import yaml
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

# =============================================================================
# Load Configuration
# =============================================================================

CONFIG_PATH = Path(__file__).parent / "grpo_config.yaml"
EXPERIMENTS_LOG = Path(__file__).parent / "experiments.md"


def load_config() -> dict:
    """Load GRPO configuration from YAML."""
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


def save_config(config: dict):
    """Save updated configuration."""
    with open(CONFIG_PATH, 'w') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)


def log_experiment(iteration: int, config: dict, results: dict):
    """Append experiment results to experiments.md."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    entry = f"""
## Run {iteration} - {timestamp}

**Configuration:**
- Learning rate: {config['grpo']['learning_rate']}
- Beta (KL penalty): {config['grpo']['beta']}
- LoRA rank: {config['lora']['r']}
- Num generations: {config['grpo']['num_generations']}
- Batch size: {config['grpo']['per_device_train_batch_size']}

**Results:**
- Reward mean: {results.get('reward_mean', 'N/A'):.4f}
- Reward std: {results.get('reward_std', 'N/A'):.4f}
- Keyword accuracy: {results.get('keyword_accuracy', 'N/A'):.2%}
- Length compliance: {results.get('length_compliance', 'N/A'):.2%}
- Training time: {results.get('train_time_mins', 'N/A'):.1f} mins
- Estimated cost: ${results.get('estimated_cost', 'N/A'):.2f}

**Diagnosis:** {results.get('diagnosis', 'Pending analysis')}

**Next action:** {results.get('next_action', 'TBD')}

---
"""
    
    with open(EXPERIMENTS_LOG, 'a') as f:
        f.write(entry)
    
    print(f"📝 Logged to {EXPERIMENTS_LOG}")


# =============================================================================
# Reward Function
# =============================================================================

# =============================================================================
# Domain Keywords - Enhanced from Abdullah's Gong Transcripts
# =============================================================================

# MEP/Solar industry terms
MEP_KEYWORDS = [
    "mep", "contractor", "project", "estimate", "bid", "proposal",
    "client", "customer", "hvac", "electrical", "plumbing", "mechanical",
    "subcontractor", "solar", "residential", "commercial", "installation",
    "service", "technician", "crew", "field", "dispatch", "route"
]

# Coperniq-specific terms (from Abdullah's demos)
COPERNIQ_KEYWORDS = [
    "coperniq", "workflow", "pipeline", "stages", "hierarchy", "sla",
    "blocking", "automation", "portal", "customer portal", "dispatch",
    "site survey", "permitting", "pto", "work order", "form",
    "enphase", "solaredge", "aurora", "quickbooks", "integration"
]

# Abdullah's frequent demo phrases
ABDULLAH_DEMO_PHRASES = [
    "over here", "you can see", "for example", "let me show",
    "if you notice", "so basically", "makes sense", "absolutely",
    "excellent", "customizable", "completely customizable"
]

# Sales methodology terms
SALES_KEYWORDS = [
    "pain point", "solution", "roi", "value", "efficiency",
    "discovery", "qualification", "demo", "next steps", "timeline",
    "implementation", "onboarding", "pricing", "cost", "budget"
]

# Negotiation/closing terms
NEGOTIATION_KEYWORDS = [
    "negotiate", "objection", "handling", "close", "qualify",
    "stakeholder", "decision maker", "champion", "blocker",
    "urgency", "competitor", "sunbase", "servicetitan", "scoop"
]

# Question patterns Abdullah uses effectively
QUESTION_PATTERNS = [
    "what type of", "how many", "do you guys", "are you guys",
    "tell me about", "how does", "when are you", "would you be"
]

# =============================================================================
# Sales Book Keywords - CHALLENGER SALE PRIORITIZED (60%+)
# =============================================================================

# The Challenger Sale - Commercial Teaching (PRIMARY METHODOLOGY - 60%+ weight)
# Three pillars: TEACH, TAILOR, TAKE CONTROL
CHALLENGER_KEYWORDS = [
    # Core methodology
    "challenger", "teaching", "tailoring", "taking control", "commercial insight",
    "constructive tension", "reframe", "unique perspective", "thought leader",

    # Teaching pillar - lead with insights
    "teach", "insight", "educate", "perspective", "show you", "consider this",
    "what if", "have you thought about", "most companies don't realize",
    "the data shows", "research indicates", "industry trend",

    # Tailoring pillar - adapt to stakeholders
    "tailor", "customize", "specific to your", "in your situation",
    "for your team", "your industry", "your competitors", "your market",

    # Taking control pillar - assertive guidance
    "take control", "guide", "lead", "direct", "recommend", "should",
    "the best approach", "here's what works", "let me suggest",
    "push back", "challenge", "provoke", "assert",

    # Commercial teaching outcomes
    "customer insight", "value driver", "solution selling", "consultative",
    "differentiate", "competitive advantage", "unique value"
]

# Challenger Sale - Key Phrases (exact matches get bonus)
CHALLENGER_PHRASES = [
    "let me teach you something",
    "what most companies miss",
    "here's what the best do",
    "the real question is",
    "have you considered",
    "based on what I've seen",
    "in similar situations",
    "what separates the best",
    "the cost of inaction",
    "reframe how you think about"
]

# Never Split the Difference (Chris Voss) - LIMITED TO <25%
# Only use sparingly - not the primary methodology
CHRIS_VOSS_KEYWORDS = [
    "mirroring", "labeling", "that's right", "calibrated question",
    "active listening", "counterpart"
]

# Jobs to be Done (Ulwick) - Outcome-Driven Innovation
JTBD_KEYWORDS = [
    "job to be done", "outcome", "underserved", "customer need",
    "desired outcome", "progress", "struggling moment", "hiring"
]

# Blue Ocean Strategy - Market Creation
BLUE_OCEAN_KEYWORDS = [
    "blue ocean", "value innovation", "make competition irrelevant",
    "eliminate", "reduce", "raise", "create", "noncustomers"
]

# Business Model Generation (Osterwalder) - Canvas Framework
BUSINESS_MODEL_KEYWORDS = [
    "value proposition", "customer segment", "revenue stream",
    "key resource", "business model canvas"
]


def compute_reward(
    response: str,
    prompt: str,
    config: dict
) -> tuple[float, dict]:
    """
    Multi-signal reward function for GRPO training.
    
    Returns:
        reward: float between 0 and 1
        signals: dict with individual signal scores
    """
    weights = config['reward']['weights']
    signals = {}
    
    response_lower = response.lower()
    response_len = len(response)
    
    # 1. Length appropriate (0-1)
    min_len = config['reward']['min_length']
    max_len = config['reward']['max_length']
    target_len = config['reward']['target_length']
    
    if response_len < min_len:
        signals['length_appropriate'] = response_len / min_len
    elif response_len > max_len:
        signals['length_appropriate'] = max(0, 1 - (response_len - max_len) / max_len)
    else:
        # Gaussian around target length
        distance = abs(response_len - target_len) / target_len
        signals['length_appropriate'] = max(0, 1 - distance)
    
    # 2. Keyword coverage (0-1) - CHALLENGER SALE PRIORITIZED
    # Domain-specific keywords (Coperniq product knowledge)
    domain_keywords = MEP_KEYWORDS + COPERNIQ_KEYWORDS + ABDULLAH_DEMO_PHRASES

    # CHALLENGER METHODOLOGY (60%+ weight)
    challenger_hits = sum(1 for kw in CHALLENGER_KEYWORDS if kw in response_lower)
    challenger_phrase_hits = sum(1 for phrase in CHALLENGER_PHRASES if phrase in response_lower)

    # Supporting methodologies (40% combined)
    jtbd_hits = sum(1 for kw in JTBD_KEYWORDS if kw in response_lower)
    blue_ocean_hits = sum(1 for kw in BLUE_OCEAN_KEYWORDS if kw in response_lower)
    business_model_hits = sum(1 for kw in BUSINESS_MODEL_KEYWORDS if kw in response_lower)

    # Chris Voss - LIMITED (<25% of methodology weight)
    voss_hits = sum(1 for kw in CHRIS_VOSS_KEYWORDS if kw in response_lower)

    # Domain (Coperniq product)
    domain_hits = sum(1 for kw in domain_keywords if kw in response_lower)

    # Calculate methodology score with CHALLENGER PRIORITY
    # Challenger: 60%, Other books: 25%, Chris Voss: 15% max
    challenger_score = min(1.0, (challenger_hits / 4) * 0.6 + (challenger_phrase_hits * 0.15))
    other_books_score = min(0.25, (jtbd_hits + blue_ocean_hits + business_model_hits) / 6 * 0.25)
    voss_score = min(0.15, (voss_hits / 3) * 0.15)  # CAPPED at 15%

    methodology_score = challenger_score + other_books_score + voss_score

    # Domain bonus (Coperniq-specific)
    domain_score = min(0.3, domain_hits / 5 * 0.3)

    signals['keyword_coverage'] = min(1.0, methodology_score + domain_score)
    signals['challenger_score'] = challenger_score  # Track separately for debugging
    
    # 3. Structure quality (0-1)
    has_structure = 0
    if '\n' in response:  # Has line breaks
        has_structure += 0.3
    if ':' in response:   # Has key-value style
        has_structure += 0.2
    if any(marker in response for marker in ['1.', '2.', '-', '•']):
        has_structure += 0.3
    if len(response.split('.')) >= 3:  # Has multiple sentences
        has_structure += 0.2
    signals['structure_quality'] = min(1.0, has_structure)
    
    # 4. No hallucination signals (0-1)
    # Penalize obvious hallucination patterns
    hallucination_penalty = 0
    fake_patterns = [
        "as an ai", "i cannot", "i don't have access",
        "hypothetically", "in theory", "i would imagine"
    ]
    for pattern in fake_patterns:
        if pattern in response_lower:
            hallucination_penalty += 0.2
    signals['no_hallucination'] = max(0, 1 - hallucination_penalty)
    
    # 5. Action-oriented (0-1)
    action_verbs = [
        "should", "recommend", "try", "use", "consider",
        "start", "focus", "ask", "listen", "follow up",
        "emphasize", "show", "demonstrate", "explain", "position"
    ]
    actions_found = sum(1 for verb in action_verbs if verb in response_lower)
    signals['action_oriented'] = min(1.0, actions_found / 3)

    # 6. Sales technique quality (bonus signal - not weighted but tracked)
    # Checks for proper sales methodology patterns
    technique_score = 0

    # Discovery questions included?
    has_questions = sum(1 for pattern in QUESTION_PATTERNS if pattern in response_lower)
    if has_questions > 0:
        technique_score += 0.3

    # Next steps mentioned?
    if any(phrase in response_lower for phrase in ["next step", "follow up", "schedule", "timeline"]):
        technique_score += 0.2

    # Empathy/validation shown?
    if any(phrase in response_lower for phrase in ["understand", "makes sense", "i see", "absolutely"]):
        technique_score += 0.2

    # Competitive positioning?
    if any(comp in response_lower for comp in ["sunbase", "servicetitan", "scoop", "competitor"]):
        technique_score += 0.15

    # Value proposition clear?
    if any(val in response_lower for val in ["roi", "efficiency", "save time", "automate", "streamline"]):
        technique_score += 0.15

    signals['sales_technique'] = min(1.0, technique_score)

    # Compute weighted reward
    reward = sum(
        signals[key] * weights[key]
        for key in weights
    )
    
    return reward, signals


def create_reward_function(config: dict):
    """Create reward function for GRPO trainer."""
    def reward_fn(completions, prompts, **kwargs):
        """
        GRPO reward function interface.
        
        Args:
            completions: List of generated responses
            prompts: List of input prompts
        
        Returns:
            List of reward scores
        """
        rewards = []
        for completion, prompt in zip(completions, prompts):
            reward, _ = compute_reward(completion, prompt, config)
            rewards.append(reward)
        return rewards
    
    return reward_fn


# =============================================================================
# Main Training Loop
# =============================================================================

def main(iteration: Optional[int] = None):
    """Run GRPO training iteration."""
    
    # Load config
    config = load_config()
    current_iteration = iteration or config.get('iteration', 1)
    
    print("=" * 60)
    print(f"GRPO Training - Iteration {current_iteration}")
    print("=" * 60)
    
    # Update config status
    config['iteration'] = current_iteration
    config['status'] = 'running'
    save_config(config)
    
    try:
        # Import Unsloth (do this inside try block for better error messages)
        from unsloth import FastLanguageModel
        from unsloth.chat_templates import get_chat_template
        from trl import GRPOTrainer, GRPOConfig
        from datasets import Dataset
        import time
        
        start_time = time.time()
        
        # =====================================================================
        # 1. Load Model
        # =====================================================================
        print("\n📦 Loading model...")
        model_config = config['model']
        
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=model_config['name'],
            max_seq_length=model_config['max_seq_length'],
            load_in_4bit=model_config['load_in_4bit'],
            dtype=model_config['dtype'],
        )
        
        tokenizer = get_chat_template(tokenizer, chat_template="qwen-2.5")
        
        # =====================================================================
        # 2. Configure LoRA
        # =====================================================================
        print("🔧 Configuring LoRA...")
        lora_config = config['lora']
        
        model = FastLanguageModel.get_peft_model(
            model,
            r=lora_config['r'],
            lora_alpha=lora_config['alpha'],
            target_modules=lora_config['target_modules'],
            lora_dropout=lora_config['dropout'],
            bias="none",
            use_gradient_checkpointing="unsloth",
            random_state=42,
        )
        
        # =====================================================================
        # 3. Load Training Data
        # =====================================================================
        print("📚 Loading training data...")
        data_path = Path(__file__).parent / "grpo_prompts.json"
        
        if not data_path.exists():
            raise FileNotFoundError(
                f"GRPO prompts not found: {data_path}\n"
                "Create grpo_prompts.json with training prompts."
            )
        
        with open(data_path) as f:
            prompts_data = json.load(f)
        
        # GRPO needs prompts, not full conversations
        dataset = Dataset.from_list([
            {"prompt": p["prompt"]} for p in prompts_data["prompts"]
        ])
        
        print(f"   Loaded {len(dataset)} training prompts")
        
        # =====================================================================
        # 4. Configure GRPO Trainer
        # =====================================================================
        print("⚙️  Configuring GRPO trainer...")
        grpo_config = config['grpo']
        output_dir = f"{config['output']['dir']}/iteration_{current_iteration}"
        
        training_args = GRPOConfig(
            output_dir=output_dir,
            
            # GRPO specific
            num_generations=grpo_config['num_generations'],
            max_completion_length=grpo_config['max_completion_length'],
            beta=grpo_config['beta'],
            
            # Training
            learning_rate=grpo_config['learning_rate'],
            num_train_epochs=grpo_config['num_train_epochs'],
            per_device_train_batch_size=grpo_config['per_device_train_batch_size'],
            gradient_accumulation_steps=grpo_config['gradient_accumulation_steps'],
            
            # Optimization
            warmup_ratio=grpo_config['warmup_ratio'],
            weight_decay=grpo_config['weight_decay'],
            optim=grpo_config['optim'],
            
            # Precision
            bf16=grpo_config['bf16'],
            
            # Logging
            logging_steps=grpo_config['logging_steps'],
            save_steps=grpo_config['save_steps'],
            
            # Misc
            seed=42 + current_iteration,  # Different seed each iteration
        )
        
        # Create trainer
        trainer = GRPOTrainer(
            model=model,
            args=training_args,
            train_dataset=dataset,
            processing_class=tokenizer,
            reward_funcs=create_reward_function(config),
        )
        
        # =====================================================================
        # 5. Train
        # =====================================================================
        print("\n" + "=" * 60)
        print("🚀 Starting GRPO training...")
        print("=" * 60)
        
        trainer_stats = trainer.train()
        
        train_time = (time.time() - start_time) / 60  # minutes
        
        # =====================================================================
        # 6. Evaluate
        # =====================================================================
        print("\n📊 Running evaluation...")
        eval_results = evaluate_model(model, tokenizer, config)
        
        # =====================================================================
        # 7. Save Results
        # =====================================================================
        print("\n💾 Saving model...")
        
        if config['output']['save_lora']:
            lora_path = f"{output_dir}/lora"
            model.save_lora(lora_path)
            print(f"   → LoRA weights: {lora_path}/")
        
        if config['output']['save_gguf']:
            gguf_path = f"{output_dir}/gguf"
            model.save_pretrained_gguf(
                gguf_path,
                tokenizer,
                quantization_method=config['output']['gguf_quant'],
            )
            print(f"   → GGUF: {gguf_path}/")
        
        # =====================================================================
        # 8. Analyze & Log
        # =====================================================================
        results = {
            'reward_mean': eval_results['reward_mean'],
            'reward_std': eval_results['reward_std'],
            'keyword_accuracy': eval_results['keyword_accuracy'],
            'length_compliance': eval_results['length_compliance'],
            'train_time_mins': train_time,
            'estimated_cost': train_time * 0.06,  # ~$0.06/min on 4090
            'diagnosis': analyze_results(eval_results, config),
            'next_action': suggest_next_action(eval_results, config),
        }
        
        log_experiment(current_iteration, config, results)
        
        # Check success criteria
        success = check_success_criteria(eval_results, config)
        
        # Update config
        config['status'] = 'completed'
        config['iteration'] = current_iteration + 1
        save_config(config)
        
        # =====================================================================
        # 9. Output for Ralph
        # =====================================================================
        print("\n" + "=" * 60)
        print(f"ITERATION {current_iteration} COMPLETE")
        print("=" * 60)
        print(f"Reward mean:      {results['reward_mean']:.4f}")
        print(f"Keyword accuracy: {results['keyword_accuracy']:.2%}")
        print(f"Length compliance: {results['length_compliance']:.2%}")
        print(f"Training time:    {train_time:.1f} mins")
        print(f"\nDiagnosis: {results['diagnosis']}")
        print(f"Next action: {results['next_action']}")
        
        if success:
            print("\n✅ SUCCESS CRITERIA MET!")
            print("<promise>TUNED</promise>")
        else:
            print(f"\n⏳ Continuing to iteration {current_iteration + 1}...")
        
    except Exception as e:
        config['status'] = 'failed'
        save_config(config)
        
        log_experiment(current_iteration, config, {
            'diagnosis': f'FAILED: {str(e)}',
            'next_action': 'Debug error before retrying',
        })
        
        print(f"\n❌ ERROR: {e}")
        raise


def evaluate_model(model, tokenizer, config: dict) -> dict:
    """Evaluate model on held-out test prompts."""
    eval_config = config['eval']
    
    # Load test prompts
    test_path = Path(__file__).parent / "grpo_test_prompts.json"
    if test_path.exists():
        with open(test_path) as f:
            test_data = json.load(f)
        test_prompts = test_data.get('prompts', [])[:eval_config['test_size']]
    else:
        # Fallback: use sample prompts
        test_prompts = [
            "How do I handle the objection 'Your price is too high'?",
            "What's the best way to qualify a lead using BANT?",
            "How do I identify the decision maker in an MEP company?",
        ]
    
    rewards = []
    keyword_hits = []
    length_compliant = []
    
    FastLanguageModel.for_inference(model)
    
    for prompt in test_prompts:
        messages = [{"role": "user", "content": prompt}]
        inputs = tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt"
        ).to(model.device)
        
        outputs = model.generate(
            inputs,
            max_new_tokens=config['grpo']['max_completion_length'],
            temperature=0.7,
            do_sample=True,
        )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        reward, signals = compute_reward(response, prompt, config)
        rewards.append(reward)
        keyword_hits.append(signals['keyword_coverage'] > 0.5)
        length_compliant.append(signals['length_appropriate'] > 0.7)
    
    import statistics
    
    return {
        'reward_mean': statistics.mean(rewards),
        'reward_std': statistics.stdev(rewards) if len(rewards) > 1 else 0,
        'keyword_accuracy': sum(keyword_hits) / len(keyword_hits),
        'length_compliance': sum(length_compliant) / len(length_compliant),
    }


def analyze_results(results: dict, config: dict) -> str:
    """Generate diagnosis based on results."""
    criteria = config['eval']['success_criteria']
    
    issues = []
    
    if results['reward_mean'] < criteria['reward_mean']:
        if results['reward_mean'] < 0.5:
            issues.append("Reward very low - model may be underfitting")
        else:
            issues.append("Reward below target - needs more training or better data")
    
    if results['keyword_accuracy'] < criteria['keyword_accuracy']:
        issues.append("Low keyword coverage - increase keyword signal weight")
    
    if results['length_compliance'] < criteria['length_compliance']:
        issues.append("Length issues - adjust length thresholds or add length signal")
    
    if not issues:
        return "All metrics within acceptable range"
    
    return "; ".join(issues)


def suggest_next_action(results: dict, config: dict) -> str:
    """Suggest next hyperparameter adjustment."""
    criteria = config['eval']['success_criteria']
    
    # Priority: fix biggest gap first
    gaps = {
        'reward': criteria['reward_mean'] - results['reward_mean'],
        'keyword': criteria['keyword_accuracy'] - results['keyword_accuracy'],
        'length': criteria['length_compliance'] - results['length_compliance'],
    }
    
    biggest_gap = max(gaps, key=gaps.get)
    
    suggestions = {
        'reward': "Increase learning rate by 50% or add more training epochs",
        'keyword': "Increase keyword_coverage weight in reward config",
        'length': "Adjust length thresholds: min_length, max_length, target_length",
    }
    
    if gaps[biggest_gap] <= 0:
        return "Success criteria met - no changes needed"
    
    return suggestions[biggest_gap]


def check_success_criteria(results: dict, config: dict) -> bool:
    """Check if all success criteria are met."""
    criteria = config['eval']['success_criteria']
    
    return (
        results['reward_mean'] >= criteria['reward_mean'] and
        results['keyword_accuracy'] >= criteria['keyword_accuracy'] and
        results['length_compliance'] >= criteria['length_compliance']
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GRPO Fine-Tuning")
    parser.add_argument("--iteration", type=int, help="Resume from specific iteration")
    args = parser.parse_args()
    
    main(iteration=args.iteration)
