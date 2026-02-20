#!/bin/bash
# Simulates a webhook event
curl -X POST http://localhost:3000/api/webhook/generic \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "ws-123", 
    "videoId": "v-12345", 
    "commentId": "c-98765", 
    "userId": "u-555", 
    "userName": "Tester", 
    "text": "How much is this?"
  }'
