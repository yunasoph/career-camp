.PHONY: setup up down build migrate seed test test-backend test-frontend lint lint-backend lint-frontend

setup: ## Build images + install PHP deps
	docker compose build
	docker compose run --rm php composer install
	# Optimized autoloader: on the Windows/WSL2 9P bind mount, the default
	# PSR-4 autoloader stat'ed every class file per request (~0.6s/request).
	# Re-run after `composer install`/`update` (DECISIONS.md, perf 2026-10-19).
	docker compose run --rm php composer dump-autoload -o

up: ## Start the stack
	docker compose up -d

down: ## Stop the stack
	docker compose down

build: ## Rebuild images
	docker compose build

migrate: ## Apply pending SQL migrations
	docker compose exec -T php php bin/migrate.php

seed: ## Load seed data
	docker compose exec -T php php bin/seed.php

test: test-backend test-frontend

test-backend: ## PHPUnit (inside the php container)
	docker compose exec -T php vendor/bin/phpunit

test-frontend: ## Vitest (on the host)
	cd frontend && npm test -- --run

lint: lint-backend lint-frontend

lint-backend: ## PHPStan L6 + PHP-CS-Fixer
	docker compose run --rm php vendor/bin/phpstan analyse
	docker compose run --rm php vendor/bin/php-cs-fixer fix --dry-run --diff

lint-frontend: ## ESLint + Prettier
	cd frontend && npm run lint
