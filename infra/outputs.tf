output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = "${aws_api_gateway_stage.main.invoke_url}/rf-data"
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.rf_data.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.rf_data.arn
}

output "waf_web_acl_id" {
  description = "WAF WebACL ID"
  value       = aws_wafv2_web_acl.main.id
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.main.arn
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.drone_vpc.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}
