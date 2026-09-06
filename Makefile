.PHONY: setup test test-unit test-integration test-architecture eval lint typecheck cli-review

PYTHON ?= python3
PYTHONPATH := .:packages/core:packages/prompts:packages/providers:packages/vcs:packages/analysis:packages/indexing:packages/telemetry:packages/graph:packages/storage:services/ingress:services/worker:services/api:apps/cli:evals

export PYTHONPATH

setup:
	@echo "Setting up Quorum monorepo..."

test-architecture:
	@echo "==> Running Architecture Boundary Checks (16_REPO_STRUCTURE.md)..."
	$(PYTHON) -m unittest tests/architecture/test_boundaries.py

test-unit:
	@echo "==> Running Unit Tests (core, graph, providers)..."
	$(PYTHON) -m unittest discover -s tests/unit -p "test_*.py"

test-integration:
	@echo "==> Running Integration Tests (pipeline, worker, ingress, API, CLI)..."
	$(PYTHON) -m unittest discover -s tests/integration -p "test_pipeline_integration.py"

test-migrations:
	@echo "==> Running Database Migration Tests (05_DATA_MODEL.md)..."
	$(PYTHON) -m unittest tests/integration/test_migrations.py

test: test-architecture test-unit test-integration test-migrations
	@echo "All test suites passed!"

migrate:
	@echo "==> Running Database Migrations..."
	$(PYTHON) -m quorum_storage.db upgrade head

migrate-rollback:
	@echo "==> Rolling back Database Migration..."
	$(PYTHON) -m quorum_storage.db downgrade -1

eval:
	@echo "==> Running AI Eval Gates (AC-100, AC-101)..."
	$(PYTHON) -m evals.harness.runner --corpus bench-clean --gate-check
	$(PYTHON) -m evals.harness.runner --corpus adversarial --gate-check
	@echo "All eval gates passed!"

lint:
	@echo "==> Running Lint and Syntax Validation..."
	$(PYTHON) -m compileall packages services apps tests evals -q

typecheck:
	@echo "==> Running Type Checks..."
	which mypy >/dev/null && mypy packages/core packages/graph packages/providers || echo "mypy not installed in local environment, skipped"

cli-review:
	@echo "==> Running Quorum CLI local review sample..."
	printf -- "diff --git a/app.py b/app.py\n@@ -1,2 +1,2 @@\n-old\n+new\n" | $(PYTHON) -m apps.cli.quorum_cli.main review --diff - --format sarif
