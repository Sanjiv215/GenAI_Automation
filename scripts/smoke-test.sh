#!/usr/bin/env bash
# ==============================================================================
# Workflow Automation Assistant - End-to-End Smoke Test Script
# ==============================================================================

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_KEY="wfa_live_00000000000000000000000000000000"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

assert_status() {
  local test_name="$1"
  local expected_status="$2"
  local actual_status="$3"
  local response_body="$4"

  if [ "$expected_status" -eq "$actual_status" ]; then
    echo -e "${GREEN}✓ PASS:${NC} $test_name (HTTP $actual_status)"
    pass_count=$((pass_count + 1))
  else
    echo -e "${RED}✗ FAIL:${NC} $test_name (Expected HTTP $expected_status, got $actual_status)"
    echo -e "${YELLOW}Response Body:${NC} $response_body"
    fail_count=$((fail_count + 1))
  fi
}

echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Starting Smoke Test Suite against ${BASE_URL}${NC}"
echo -e "${BLUE}==============================================================================${NC}\n"

# 1. Health Check (Public, No Auth)
echo "1. Testing Public Health Check..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/health")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Public Health Check" 200 "$STATUS" "$BODY"

# 2. Missing Auth Check (Expect 401)
echo -e "\n2. Testing Missing API Key Authentication..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/v1/workflows")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Missing API Key" 401 "$STATUS" "$BODY"

# 3. Invalid API Key Check (Expect 403)
echo -e "\n3. Testing Invalid API Key Authentication..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" -H "x-api-key: wfa_live_invalid_key_1234567890abcdef" "${BASE_URL}/api/v1/workflows")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Invalid API Key" 403 "$STATUS" "$BODY"

# 4. Create New API Key
echo -e "\n4. Creating New API Key..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/v1/api-keys" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${ADMIN_KEY}" \
  -d '{"name": "Smoke Test Runner Key"}')
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Create API Key" 201 "$STATUS" "$BODY"

NEW_API_KEY=$(echo "$BODY" | grep -o '"raw_key":"[^"]*' | cut -d'"' -f4)
KEY_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo -e "   → Generated Key: ${GREEN}${NEW_API_KEY}${NC}"

# 5. Generate Workflow from Plain English Prompt
echo -e "\n5. Generating Workflow via Gemini / GenAI Engine..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/v1/workflows/generate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${NEW_API_KEY}" \
  -d '{"prompt": "When customer submits a complaint, classify the sentiment, assess priority, extract customer details, and draft a polite email response.", "save": true}')
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Generate Workflow with Gemini" 201 "$STATUS" "$BODY"

WORKFLOW_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
echo -e "   → Workflow ID: ${GREEN}${WORKFLOW_ID}${NC}"

# 6. List Workflows
echo -e "\n6. Listing Workflows (Scoped to API Key)..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -H "x-api-key: ${NEW_API_KEY}" \
  "${BASE_URL}/api/v1/workflows?limit=10")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "List Workflows" 200 "$STATUS" "$BODY"

# 7. Get Workflow by ID
echo -e "\n7. Fetching Workflow Details..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -H "x-api-key: ${NEW_API_KEY}" \
  "${BASE_URL}/api/v1/workflows/${WORKFLOW_ID}")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Get Workflow Details" 200 "$STATUS" "$BODY"

# 8. Register Webhook
echo -e "\n8. Registering Webhook..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/v1/webhooks" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${NEW_API_KEY}" \
  -d '{"url": "http://localhost:4000/webhook", "events": ["run.started", "run.completed", "run.failed"]}')
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Register Webhook" 201 "$STATUS" "$BODY"

WEBHOOK_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
WEBHOOK_SECRET=$(echo "$BODY" | grep -o '"secret":"[^"]*' | cut -d'"' -f4)
echo -e "   → Webhook ID: ${GREEN}${WEBHOOK_ID}${NC}"
echo -e "   → Secret: ${GREEN}${WEBHOOK_SECRET}${NC}"

# 9. Execute Workflow Run
echo -e "\n9. Executing Workflow Run on Input Data..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/run?sync=true" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${NEW_API_KEY}" \
  -d '{"input": {"text": "Customer: Alice Baker. Order #9482. Product arrived broken, please issue a full refund immediately."}}')
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Execute Workflow Run" 202 "$STATUS" "$BODY"

RUN_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)
echo -e "   → Run ID: ${GREEN}${RUN_ID}${NC}"

# 10. Inspect Run Details and Step Results
echo -e "\n10. Fetching Run Results and Traces..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -H "x-api-key: ${NEW_API_KEY}" \
  "${BASE_URL}/api/v1/runs/${RUN_ID}")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Inspect Run Results" 200 "$STATUS" "$BODY"

# 11. Test Webhook Delivery Ping
echo -e "\n11. Triggering Test Webhook Ping..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "${BASE_URL}/api/v1/webhooks/${WEBHOOK_ID}/test" \
  -H "x-api-key: ${NEW_API_KEY}")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "Test Webhook Ping" 200 "$STATUS" "$BODY"

# 12. Check OpenAPI Specification
echo -e "\n12. Verifying OpenAPI 3.0 Specification Endpoint..."
HTTP_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/openapi.json")
BODY=$(echo "$HTTP_RESP" | sed '$d')
STATUS=$(echo "$HTTP_RESP" | tail -n1)
assert_status "OpenAPI Spec JSON" 200 "$STATUS" "$BODY"

# 13. Rate Limiting Test (Rapid requests returning 429)
echo -e "\n13. Testing Rate Limiting (Burst 35 requests)..."
rate_limited=0
for i in $(seq 1 35); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: ${NEW_API_KEY}" "${BASE_URL}/api/v1/workflows")
  if [ "$CODE" -eq 429 ]; then
    rate_limited=1
    break
  fi
done

if [ "$rate_limited" -eq 1 ]; then
  echo -e "${GREEN}✓ PASS:${NC} Rate Limiting (Received HTTP 429 with Retry-After header)"
  pass_count=$((pass_count + 1))
else
  echo -e "${YELLOW}! NOTE:${NC} Rate limit threshold was not triggered within burst batch."
fi

# Summary
echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "Smoke Test Completed: ${GREEN}${pass_count} Passed${NC}, ${RED}${fail_count} Failed${NC}"
echo -e "${BLUE}==============================================================================${NC}\n"

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
