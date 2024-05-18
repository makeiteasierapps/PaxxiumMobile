#!/bin/bash

gcloud functions deploy sam \
  --gen2 \
  --runtime=python311 \
  --trigger-http \
  --entry-point=sam \
  --region=us-west1 \
  --source=. \
  --allow-unauthenticated \
  --timeout=540s \