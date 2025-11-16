#!/bin/bash
set -euo pipefail

echo "🔍 Validating Terraform configuration..."

# Check Terraform version
terraform version

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init -backend=false

# Validate syntax
echo "✅ Validating syntax..."
terraform validate

# Format check
echo "🎨 Checking format..."
terraform fmt -check -recursive

# Security scan with tfsec (if installed)
if command -v tfsec &> /dev/null; then
  echo "🔒 Running security scan..."
  tfsec .
else
  echo "⚠️  tfsec not installed, skipping security scan"
  echo "   Install: brew install tfsec"
fi

# Cost estimation with infracost (if installed and configured)
if command -v infracost &> /dev/null; then
  echo "💰 Estimating costs..."
  infracost breakdown --path . || echo "⚠️  Infracost not configured"
else
  echo "⚠️  infracost not installed, skipping cost estimation"
  echo "   Install: brew install infracost"
fi

echo "✨ Validation complete!"
