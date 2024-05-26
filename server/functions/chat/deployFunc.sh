#!/bin/bash

CHAT_SERVICE_FILE="../../services/ChatService.py"
BOSS_AGENT_FILE="../../agents/BossAgent.py"

cp "$CHAT_SERVICE_FILE" .
cp "$BOSS_AGENT_FILE" .

gcloud functions deploy chatMobile \
  --gen2 \
  --runtime=python311 \
  --trigger-http \
  --entry-point=chat \
  --region=us-west1 \
  --source=. \
  --allow-unauthenticated \
  --timeout=540s \