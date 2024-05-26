#!/bin/bash

MOMENT_SERVICE_FILE="../../services/MomentService.py"
BOSS_AGENT_FILE="../../agents/BossAgent.py"

cp "$MOMENT_SERVICE_FILE" .
cp "$BOSS_AGENT_FILE" .

gcloud functions deploy moments \
  --gen2 \
  --runtime=python311 \
  --trigger-http \
  --entry-point=moments \
  --region=us-west1 \
  --source=. \
  --allow-unauthenticated \
  --timeout=540s \