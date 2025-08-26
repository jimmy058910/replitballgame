#!/bin/bash
gcloud services enable cloudbuild.googleapis.com 
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable containeranalysis.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sourcerepo.googleapis.com
echo "✅ All services enabled"
