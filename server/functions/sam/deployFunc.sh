#!/bin/bash

BOSS_AGENT_FILE="../../agents/BossAgent.py"
cp "$BOSS_AGENT_FILE" .

gcloud functions deploy sam \
  --gen2 \
  --runtime=python311 \
  --trigger-http \
  --entry-point=sam \
  --region=us-west1 \
  --source=. \
  --allow-unauthenticated \
  --timeout=540s \