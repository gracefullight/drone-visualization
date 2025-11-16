variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["ap-southeast-2a", "ap-southeast-2b"]
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = false
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "drone-viz"
}

variable "cors_allow_origins" {
  description = "CORS allowed origins (comma-separated list)"
  type        = string
  default     = "https://gracefullight.github.io,https://gracefullight.dev"
}

variable "waf_rate_limit" {
  description = "WAF rate limit (requests per 5 minutes from single IP)"
  type        = number
  default     = 2000
}
