#!/bin/bash

# DreamUp QA Pipeline - Comprehensive Test Suite
# Tests the system against multiple game types

echo "🎮 DreamUp QA Pipeline - Validation Test Suite"
echo "=============================================="
echo ""

# Configuration
TIMEOUT=120000
SCREENSHOTS=5
OUTPUT_DIR="./test-results"

# Test cases: (URL, Name, Type)
declare -a GAMES=(
    "https://example-games-705a0.web.app/pong|Pong|Arcade Game"
    "https://example-games-705a0.web.app/snake|Snake|Arcade Game"
    "https://funhtml5games.com/2048/index.html|2048|Puzzle Game"
    "https://funhtml5games.com/pacman/index.html|Pac-Man|Arcade Game"
)

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
SKIPPED=0

# Function to run a single test
run_test() {
    local url="$1"
    local name="$2"
    local type="$3"

    echo ""
    echo -e "${YELLOW}Testing: ${GREEN}$name${NC} (${YELLOW}$type${NC})"
    echo "URL: $url"
    echo "---"

    # Run the test (use src/index.ts directly with npx tsx)
    npx tsx src/index.ts "$url" \
        --timeout $TIMEOUT \
        --screenshots $SCREENSHOTS \
        --output $OUTPUT_DIR \
        > "test-results/${name}-test.log" 2>&1

    # Check result
    if [ $? -eq 0 ]; then
        # Check if playability score exists in output
        if grep -q '"playability_score"' "test-results/${name}-test.log"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAILED${NC} (No playability score)"
            ((FAILED++))
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (Execution error)"
        ((FAILED++))
    fi

    # Wait between tests to avoid Browserbase session limits
    echo "Waiting 30 seconds before next test..."
    sleep 30
}

# Main test loop
echo "Found ${#GAMES[@]} test cases to run"
echo ""

for game_info in "${GAMES[@]}"; do
    IFS='|' read -r url name type <<< "$game_info"
    run_test "$url" "$name" "$type"
done

# Summary
echo ""
echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
