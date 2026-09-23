# GRPO Fine-Tuning Task - Coperniq Sales Agent

## GOAL

Train a Qwen2.5-3B model to be an expert Coperniq sales assistant using GRPO.
The model should provide structured, actionable sales advice with MEP domain knowledge.

## CURRENT STATE

- Config: training-data/grpo_config.yaml
- Training script: training-data/train_grpo.py
- Experiment log: training-data/experiments.md
- Training prompts: training-data/grpo_prompts.json (30 prompts)
- Test prompts: training-data/grpo_test_prompts.json (15 held-out)

## SUCCESS CRITERIA (all must pass)

- Reward mean ≥ 0.75
- Keyword accuracy ≥ 80%
- Length compliance ≥ 90%

## EACH ITERATION, DO THIS:

1. **Read experiments.md** to understand what's been tried and results so far

2. **Analyze previous results** (if any):
   - What was the biggest gap from success criteria?
   - What hyperparameter change was suggested?
3. **Update grpo_config.yaml** with ONE change based on analysis:
   - If reward low & first iteration → try defaults
   - If reward low after training → increase learning_rate by 50%
   - If reward plateaued → try increasing beta (KL penalty)
   - If keyword accuracy low → increase keyword_coverage weight
   - If length issues → adjust min_length/max_length/target_length
   - If overfitting → reduce num_train_epochs or increase beta

4. **Run training**:

   ```bash
   cd /Users/tmkipper/Desktop/tk_projects/unsloth-mcp-server
   python training-data/train_grpo.py
   ```

5. **Review output**:
   - Check experiments.md for logged results
   - Note the diagnosis and suggested next action

6. **Repeat** until success criteria met OR max iterations reached

## STUCK AFTER 7 ITERATIONS?

If not converging after 7 iterations:

1. Document best config so far in experiments.md
2. List all hyperparameter combinations tried
3. Suggest data improvements:
   - More training prompts?
   - Better reward signal weights?
   - Different base model?
4. Save the best checkpoint found

## HYPERPARAMETER ADJUSTMENT GUIDE

| Symptom            | Diagnosis          | Fix                                          |
| ------------------ | ------------------ | -------------------------------------------- |
| Reward < 0.4       | Underfitting       | Increase LR, add epochs                      |
| Reward 0.4-0.6     | Learning but slow  | Increase LR by 50%                           |
| Reward oscillating | LR too high        | Decrease LR by 50%                           |
| Keyword < 60%      | Wrong signals      | Increase keyword_coverage weight to 0.35     |
| Length < 70%       | Bad length targets | Adjust target_length based on actual outputs |
| Reward std high    | Inconsistent       | Increase num_generations to 6                |

## OUTPUT FORMAT

When complete, output exactly:

```
<promise>TUNED</promise>
```

This signals the Ralph loop to stop.

## NOTES

- Each iteration takes ~30-60 mins on RunPod 4090
- Estimated cost: ~$2-3 per iteration
- Max budget for 10 iterations: ~$25-30
- Save best model even if criteria not fully met
