# Changelog

All notable changes to the Unsloth MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-12-28

### Added

- **Checkpoint Management System** (`src/utils/checkpoint.ts`)
  - Save/load/resume training checkpoints with versioning
  - Automatic checkpoint directory management
  - Checkpoint metadata tracking (step, epoch, loss, model config)
  - Resume command generation for interrupted training
  - Auto-cleanup of old checkpoints (configurable max)
  - Support for RunPod volume storage
- **Cost Tracking Dashboard** (`src/utils/cost-tracker.ts`)
  - Real-time GPU session cost tracking
  - Budget management with daily/weekly/monthly limits
  - Cost alerts with configurable thresholds
  - Per-project and per-job cost attribution
  - CSV export for expense reporting
  - Dashboard with active sessions and budget status
- **Comprehensive Test Suite** (180 tests total)
  - Knowledge module tests (57 tests): OCR, AI enhancement, training generation
  - Checkpoint manager tests: save, load, list, delete, cleanup, resume
  - Cost tracker tests: sessions, alerts, budgets, persistence, export
  - All tests passing with isolated test directories

### Fixed

- Version mismatch between package.json and index.ts
- Infinite recursion bug in checkpoint copyDirectory when model directory overlapped checkpoint directory
- Checkpoint listing filter now correctly matches job IDs

## [2.2.0] - 2025-12-21

### Added

- **Knowledge Base Pipeline** (`src/knowledge/`)
  - Multi-engine OCR support (Tesseract, EasyOCR, Claude Vision)
  - AI-powered content enhancement with Claude
  - Training pair generation (Q&A, instruction, explanation formats)
  - SQLite database for knowledge storage
  - Support for Alpaca, ShareGPT, and ChatML export formats
  - Spaced repetition (SM-2) for learning optimization
  - Quality review with confidence scoring
- **10 Knowledge Capture MCP Tools**
  - `knowledge_process_image` - OCR with multi-engine support
  - `knowledge_enhance_entry` - AI-powered text enhancement
  - `knowledge_create_entry` - Create knowledge entries
  - `knowledge_get_stats` - Database statistics
  - `knowledge_list_entries` - Browse entries with pagination
  - `knowledge_generate_pairs` - Generate training pairs
  - `knowledge_export_dataset` - Export to training formats
  - `knowledge_batch_process` - Batch image processing
  - `knowledge_search` - Full-text search
  - `knowledge_quality_review` - Quality assessment
- **RunPod Integration** (11 tools)
  - Full pod lifecycle management
  - Remote training job execution
  - Cost estimation and tracking
  - Training log streaming

### Changed

- Total tools increased from 12 to 33
- Test count increased from 43 to 123

## [2.1.0] - 2025-11-07

### Added

- **Configuration System**: Flexible config via JSON files or environment variables
  - Support for `config.json`, `~/.unsloth-mcp-config.json`, or `CONFIG_FILE` env var
  - Hot reload capability
  - Validation and defaults for all settings
- **Caching Layer**: Smart caching for expensive operations
  - In-memory and disk-based cache with TTL
  - Configurable cache size and expiration
  - Automatic cleanup of expired entries
  - Cache statistics and management
- **Progress Reporting**: Real-time progress updates
  - Progress callback system
  - Stage-based progress tracking
  - ETA calculations
  - Integration with Python script execution
- **CLI Tool**: Enhanced command-line interface
  - Installation checking
  - Model listing
  - Configuration viewer
  - Metrics dashboard
  - Cache management
  - Colorized output

### Changed

- Resource limits now configurable via config system
- Improved modularity with separate util modules

## [2.0.1] - 2025-11-07

### Added

- **Testing Infrastructure**
  - Jest testing framework with 43 comprehensive tests
  - 100% coverage on validation and metrics utilities
  - Test scripts: test, test:watch, test:coverage
- **Logging & Observability**
  - Winston structured logging
  - File and console transports
  - Request/response logging
  - Performance metrics tracking
- **Input Validation**
  - Comprehensive validation for all 12 tools
  - Model name, file path, numeric range validation
  - Path traversal prevention
  - Helpful error messages with suggestions
- **Security**
  - Input sanitization for Python scripts
  - Dangerous pattern detection
  - Resource limits enforcement
  - Rate limiting (max 3 concurrent operations)
  - Fixed all npm security vulnerabilities (0 vulnerabilities)
- **Error Handling**
  - Smart error detection with context
  - Specific handling for timeouts, ENOENT, EACCES, OOM
  - Retry logic with exponential backoff
- **Performance Metrics**
  - Tool execution tracking
  - Success/failure rate monitoring
  - Duration statistics

### Changed

- TypeScript strict mode enabled
- Modular utility structure
- Production-ready logging

## [2.0.0] - 2025-11-06

### Added

- **SuperBPE Tokenizer Training**: Train tokenizers with up to 33% fewer tokens
- **Model Information Tool**: Get detailed model architecture info
- **Tokenizer Comparison**: Compare efficiency between tokenizers
- **Performance Benchmarking**: Benchmark inference speed and memory
- **Dataset Discovery**: Search Hugging Face datasets
- **Dataset Preparation**: Format datasets for fine-tuning
- 6 new tools total
- Comprehensive documentation

### Changed

- Version bump to 2.0.0
- Enhanced README with all new tools
- Added workflow examples

## [1.0.0] - 2025-11-06

### Added

- Initial release
- Basic MCP server implementation
- 6 core tools: check_installation, list_supported_models, load_model, finetune_model, generate_text, export_model
- TypeScript implementation
- Basic error handling
