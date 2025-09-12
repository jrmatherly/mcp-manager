#!/usr/bin/env bash

# Docker development helper script for MCP Registry Gateway

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Show usage
show_usage() {
    cat << EOF
🐳 MCP Registry Gateway - Docker Development Helper

Usage: $0 [COMMAND]

Commands:
  build         Build Docker images
  up            Start development environment
  down          Stop development environment
  logs          Show logs from all services
  shell         Open shell in development container
  test          Run tests in container
  lint          Run linting in container
  clean         Clean up Docker resources
  reset         Reset development environment (clean + up)
  status        Show status of services

Examples:
  $0 up         # Start development environment with watch
  $0 shell      # Open bash shell in app container
  $0 test       # Run test suite in container
  $0 logs app   # Show logs for app service only

EOF
}

# Build images
build_images() {
    log_info "Building Docker images..."
    docker-compose build --parallel
    log_success "Images built successfully"
}

# Start development environment
start_dev() {
    log_info "Starting development environment..."
    
    # Check if uv.lock exists
    if [[ ! -f "uv.lock" ]]; then
        log_warning "uv.lock not found. Running uv lock first..."
        uv lock
    fi
    
    # Start with development profile
    docker-compose --profile dev up -d
    
    log_success "Development environment started"
    log_info "Services available:"
    echo "  🌐 App (dev):    http://localhost:8001"
    echo "  🗄️ PostgreSQL:   localhost:5432"
    echo "  📮 Redis:        localhost:6379"
    echo ""
    log_info "Use 'docker-compose watch' for file watching or '$0 logs' to see output"
}

# Stop environment
stop_env() {
    log_info "Stopping development environment..."
    docker-compose --profile dev down
    log_success "Environment stopped"
}

# Show logs
show_logs() {
    local service=${1:-}
    if [[ -n "$service" ]]; then
        log_info "Showing logs for $service..."
        docker-compose logs -f "$service"
    else
        log_info "Showing logs for all services..."
        docker-compose --profile dev logs -f
    fi
}

# Open shell in container
open_shell() {
    log_info "Opening shell in development container..."
    docker-compose --profile dev exec app-dev /bin/bash
}

# Run tests
run_tests() {
    log_info "Running tests in container..."
    docker-compose --profile dev exec app-dev uv run pytest "${@}"
}

# Run linting
run_lint() {
    log_info "Running linting in container..."
    docker-compose --profile dev exec app-dev uv run ruff check src/ tests/
    docker-compose --profile dev exec app-dev uv run mypy src/
}

# Clean up Docker resources
clean_docker() {
    log_info "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose --profile dev down --remove-orphans
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    read -p "Remove unused Docker volumes? This will delete data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        log_warning "Volumes removed"
    fi
    
    log_success "Docker cleanup completed"
}

# Reset environment
reset_env() {
    log_info "Resetting development environment..."
    clean_docker
    build_images
    start_dev
    log_success "Environment reset completed"
}

# Show status
show_status() {
    log_info "Service status:"
    docker-compose --profile dev ps
}

# Main command handling
case "${1:-}" in
    "build")
        build_images
        ;;
    "up")
        start_dev
        ;;
    "down")
        stop_env
        ;;
    "logs")
        show_logs "${2:-}"
        ;;
    "shell")
        open_shell
        ;;
    "test")
        shift
        run_tests "$@"
        ;;
    "lint")
        run_lint
        ;;
    "clean")
        clean_docker
        ;;
    "reset")
        reset_env
        ;;
    "status")
        show_status
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    "")
        show_usage
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
