# Building a Trades & Construction Training Dataset

This guide shows how to build a high-quality training dataset for construction, MEP, and skilled trades domains.

## The Opportunity

**No public dataset exists** for fine-tuning LLMs on trades knowledge. You can be the first to create one.

## Data Sources

### 1. Your Book Photos (Highest Quality)

```bash
# Start the PWA
cd pwa && npm start

# Open on your phone: http://<your-ip>:3000
# Capture pages from:
# - NEC Handbook (commentary is more permissive than code text)
# - Manufacturer installation guides
# - Trade school textbooks you own
# - Your personal notes
```

### 2. Public Government Sources (Public Domain)

- **OSHA** - osha.gov/electrical, osha.gov/construction
- **DOE** - energy.gov/eere/buildings
- **EPA Energy Star** - energystar.gov
- **HUD** - hud.gov housing guidelines

### 3. Community Q&A (Check ToS)

- Reddit: r/electricians, r/HVAC, r/Plumbing
- Trade forums: ContractorTalk, HVAC-Talk
- Stack Exchange

### 4. Manufacturer Documentation

Many manufacturers publish installation guides as PDFs:

- Carrier, Trane, Lennox (HVAC)
- Square D, Eaton (Electrical)
- Rheem, AO Smith (Water heaters)

## Using the Dataset Builder

```typescript
import { DatasetBuilder, TRADE_TEMPLATES } from './knowledge/dataset-builder.js';

// Initialize builder
const builder = new DatasetBuilder('./my_trades_dataset');

// Add Q&A pairs manually
builder.addQAPair(
  'What size wire do I need for a 40A circuit at 100 feet?',
  'For a 40A circuit at 100 feet, you need to consider voltage drop. Using the standard 3% voltage drop limit: For 240V, #8 AWG copper is minimum per NEC, but for 100ft you should upsize to #6 AWG to limit voltage drop. Always verify with NEC Table 310.16 and calculate actual voltage drop for your specific installation.',
  'electrical_systems',
  {
    topics: ['wire sizing', 'voltage drop'],
    difficulty: 'intermediate',
    trade_relevance: ['electrician'],
    code_references: ['NEC 310.16', 'NEC 210.19'],
  }
);

// Add from book content
builder.addFromBookPhoto(
  `The refrigeration cycle consists of four main processes:
   1. Compression - The compressor raises the pressure and temperature of the refrigerant
   2. Condensation - Heat is rejected as the refrigerant condenses to liquid
   3. Expansion - The metering device drops pressure, cooling the refrigerant
   4. Evaporation - The refrigerant absorbs heat, providing cooling`,
  'HVAC Fundamentals',
  'John Smith',
  'hvac_systems',
  ['refrigeration cycle', 'compression', 'condensation']
);

// Generate synthetic templates (need expert completion)
builder.generateSyntheticEntries('electrical', 20);
builder.generateSyntheticEntries('hvac', 20);
builder.generateSyntheticEntries('plumbing', 20);

// Export in multiple formats
builder.exportDataset('alpaca');
builder.exportDataset('huggingface');

// Get statistics
console.log(builder.getStats());
```

## Example Q&A Entries by Trade

### Electrical

```json
{
  "instruction": "What is the proper wire size for a 50A electric range circuit?",
  "input": "",
  "output": "Per NEC 210.19(A)(3), a 50A range circuit requires #6 AWG copper or #4 AWG aluminum. The circuit must be protected by a 50A breaker and use a 4-wire configuration (2 hots, neutral, ground) per NEC 250.140. Use Type NM-B cable for residential or THHN/THWN in conduit. The receptacle must be a NEMA 14-50R.",
  "category": "electrical_systems"
}
```

### HVAC

```json
{
  "instruction": "How do I calculate the heating load for a 2000 sq ft home?",
  "input": "",
  "output": "Use Manual J for accurate load calculations. As a rough estimate: multiply square footage by the heating factor for your climate zone (typically 25-40 BTU/sq ft). For a 2000 sq ft home in climate zone 5: 2000 x 35 = 70,000 BTU/hr. However, actual loads depend on insulation, windows, orientation, and infiltration. Always perform a full Manual J calculation for equipment sizing.",
  "category": "hvac_systems"
}
```

### Plumbing

```json
{
  "instruction": "What is the minimum vent size for a toilet?",
  "input": "",
  "output": "Per IPC Table 906.1, a water closet (toilet) requires a minimum 2-inch vent. The vent must connect within the developed length specified in the code (typically 6 feet for a 3-inch drain). The vent can be reduced to 1.5 inches after 42 inches of vertical rise. Always verify with your local plumbing code as requirements vary.",
  "category": "plumbing_systems"
}
```

### Estimating

```json
{
  "instruction": "How do I calculate labor hours for running EMT conduit?",
  "input": "",
  "output": "Typical production rates for EMT: 1/2 inch - 100 ft/hr, 3/4 inch - 80 ft/hr, 1 inch - 60 ft/hr. Add factors for: height over 10ft (+25%), exposed/finished areas (+15%), many bends (+20%). For a 200ft run of 3/4 EMT at height: 200ft ÷ 80 ft/hr = 2.5 hrs base, x 1.25 height factor = 3.1 labor hours. Always include fittings, supports, and wire pull time separately.",
  "category": "estimating"
}
```

## Quality Checklist

Before adding entries, verify:

- [ ] **Accurate** - Information is technically correct
- [ ] **Current** - Uses current code editions (NEC 2023, etc.)
- [ ] **Complete** - Includes all necessary details
- [ ] **Practical** - Provides actionable guidance
- [ ] **Referenced** - Cites code sections where applicable
- [ ] **Safe** - Includes safety considerations

## Dataset Structure

```
trades_dataset/
├── electrical/
│   ├── wire_sizing.jsonl
│   ├── load_calculations.jsonl
│   ├── grounding.jsonl
│   └── code_compliance.jsonl
├── hvac/
│   ├── refrigeration.jsonl
│   ├── load_calculations.jsonl
│   ├── ductwork.jsonl
│   └── troubleshooting.jsonl
├── plumbing/
│   ├── dwv_systems.jsonl
│   ├── water_supply.jsonl
│   └── fixtures.jsonl
├── estimating/
│   ├── takeoffs.jsonl
│   ├── labor_rates.jsonl
│   └── bidding.jsonl
├── safety/
│   ├── osha_compliance.jsonl
│   ├── ppe.jsonl
│   └── procedures.jsonl
└── metadata.json
```

## Publishing to Hugging Face

```bash
# Install huggingface_hub
pip install huggingface_hub

# Login
huggingface-cli login

# Upload dataset
python -c "
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path='./trades_dataset',
    repo_id='your-username/construction-trades-qa',
    repo_type='dataset'
)
"
```

## License Considerations

### Safe to Include:

- Your original Q&A content
- Government publications (OSHA, DOE, EPA)
- Public domain materials
- CC-licensed educational content

### Do NOT Include:

- Direct quotes from copyrighted code books (NEC, IBC, IMC)
- Copyrighted textbook content
- Proprietary manufacturer specifications
- Content from sites that prohibit scraping

### The NEC Workaround:

The NEC itself is copyrighted by NFPA. However:

- You CAN explain code requirements in your own words
- You CAN reference code sections (NEC 210.8)
- You CAN describe the intent and application
- You CANNOT copy code text verbatim

## Community Building

To build a significant dataset:

1. **Start Small** - 100-200 high-quality entries
2. **Recruit Experts** - Get licensed electricians, HVAC techs, plumbers to contribute
3. **Quality over Quantity** - Verified entries are more valuable
4. **Iterate** - Test with fine-tuning, improve based on results
5. **Share** - Publish on Hugging Face for community benefit

## Next Steps

1. Use the PWA to capture your book content
2. Add Q&A pairs from your work experience
3. Export and test with fine-tuning
4. Contribute to a public dataset
