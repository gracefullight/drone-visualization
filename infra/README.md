# Drone Visualization Infrastructure

Production-grade Terraform for the RF Data API on AWS.

## Architecture

```
Frontend (GitHub Pages)
  ↓
AWS WAF (rate limit + managed rules)
  ↓
API Gateway (REST, CORS)
  ↓
Lambda (Node.js 20, TypeScript, in VPC private subnets)
  ↓
VPC Endpoints (S3/DynamoDB) — no NAT by default
```

## Components

- **Networking (VPC)**: `drone-vpc` 10.0.0.0/16, 2× AZs (`ap-southeast-2a/b`), public/private subnets, optional NAT (disabled by default), S3/DynamoDB Gateway Endpoints
- **Compute**: Lambda Node.js 20, TypeScript build (`tsc`), 256MB, 30s timeout, reserved concurrency 10, X-Ray tracing enabled
- **API & Security**: API Gateway (REGIONAL), WAF (rate limit + managed rules), dynamic CORS
- **Observability**: CloudWatch logs (30 days), API Gateway account-level logging enabled, alarms (Lambda errors/duration/throttles, API 5xx/latency), dashboard, X-Ray

## Variables (key)

Define in `terraform.tfvars` (example values shown):

```hcl
aws_region          = "ap-southeast-2"
environment         = "production"
project_name        = "drone-visualization"
cors_allow_origins  = "https://gracefullight.github.io,https://gracefullight.dev"
vpc_cidr            = "10.0.0.0/16"
availability_zones  = ["ap-southeast-2a", "ap-southeast-2b"]
enable_nat_gateway  = false
waf_rate_limit      = 2000
```

Notes:
- `cors_allow_origins` is a comma-separated list. Lambda echoes back the request Origin only if it’s in this list; otherwise `*`.
- NAT is disabled by default for cost. Enable only if Lambda needs outbound internet.

## Quick Start

```bash
cd infra

# Optional: run local validations (syntax/format/security)
./validate.sh

# Initialize, plan, apply
terraform init
terraform plan
terraform apply

# Endpoint
terraform output api_endpoint
```

## CORS Behavior

- GET: Lambda returns `Access-Control-Allow-Origin` equal to the request `Origin` if in `cors_allow_origins`; otherwise `*`. Also sets `Vary: Origin`.
- OPTIONS: API Gateway MOCK integration returns `*` for preflight.

## Connect Frontend

Set the endpoint for the static site build (e.g., GitHub Actions secret):

```yaml
- name: Build (static export)
  env:
    GITHUB_ACTIONS: true
    NEXT_PUBLIC_RF_DATA_ENDPOINT: ${{ secrets.API_ENDPOINT }}
  run: pnpm run build
```

Store `API_ENDPOINT` = output of `terraform output -raw api_endpoint`.

## Logs & Monitoring

```bash
# Lambda logs (name includes project + function)
aws logs tail /aws/lambda/drone-visualization-rf-data --follow

# API Gateway logs
aws logs tail /aws/apigateway/drone-visualization --follow
```

Alarms included:
- Lambda: Errors, Duration (avg > 25s), Throttles
- API Gateway: 5XXError, Latency

Dashboard: consolidated Lambda, API, WAF metrics.

## Cost (rough)

- No NAT: ~$10–20/month (light traffic)
- With NAT: ~$50–70/month

## Clean Up

```bash
terraform destroy
```

## Troubleshooting

- CORS blocked: confirm the site URL is present in `cors_allow_origins` (exact match with scheme + host).
- WAF false positives: raise `waf_rate_limit` or adjust managed rules.
- Timeouts: increase Lambda timeout or reduce data per request.

## License

MIT
