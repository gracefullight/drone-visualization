resource "aws_vpc" "drone_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "drone-vpc"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.drone_vpc.id

  tags = {
    Name        = "${var.project_name}-igw"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.drone_vpc.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-public-${var.availability_zones[count.index]}"
    Type        = "public"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.drone_vpc.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + length(var.availability_zones))
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name        = "${var.project_name}-private-${var.availability_zones[count.index]}"
    Type        = "private"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? length(var.availability_zones) : 0
  domain = "vpc"

  tags = {
    Name        = "${var.project_name}-nat-eip-${var.availability_zones[count.index]}"
    Project     = var.project_name
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? length(var.availability_zones) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name        = "${var.project_name}-nat-${var.availability_zones[count.index]}"
    Project     = var.project_name
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.drone_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.project_name}-public-rt"
    Type        = "public"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.drone_vpc.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[count.index].id
    }
  }

  tags = {
    Name        = "${var.project_name}-private-rt-${var.availability_zones[count.index]}"
    Type        = "private"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_security_group" "lambda" {
  name_prefix = "${var.project_name}-lambda-"
  description = "Security group for Lambda functions"
  vpc_id      = aws_vpc.drone_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.project_name}-lambda-sg"
    Project     = var.project_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.drone_vpc.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat([aws_route_table.public.id], aws_route_table.private[*].id)

  tags = {
    Name        = "${var.project_name}-s3-endpoint"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.drone_vpc.id
  service_name      = "com.amazonaws.${var.aws_region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat([aws_route_table.public.id], aws_route_table.private[*].id)

  tags = {
    Name        = "${var.project_name}-dynamodb-endpoint"
    Project     = var.project_name
    Environment = var.environment
  }
}
