provider "aws" {
  region = "ap-southeast-2"
}

# ECR repository
resource "aws_ecr_repository" "sockethub_backend" {
  name                 = "sockethub-backend" # Same as ECR_REPOSITORY in YAML file
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Firewall
resource "aws_security_group" "sockethub_sg" {
  name        = "sockethub-sg"
  description = "Allow SSH and SocketHub traffic"

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # TODO: change to specific IP for safety
  }

  # PORT 3000
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all external connection (allow EC2 to download Docker)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Build EC2 instance
resource "aws_instance" "sockethub_server" {
  ami           = data.aws_ami.ubuntu.id # Ubuntu 22.04 LTS at ap-southeast-2
  instance_type = "t3.micro"             # Free Tier
  key_name      = "sockethub-key"

  vpc_security_group_ids = [aws_security_group.sockethub_sg.id]

  # Automatically install Docker and AWS CLI when turning on the instance.
  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install -y docker.io awscli
              sudo systemctl start docker
              sudo systemctl enable docker
              sudo usermod -aG docker ubuntu
              EOF

  tags = {
    Name = "SocketHub-Server"
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.sockethub_backend.repository_url
}

output "ec2_public_ip" {
  value = aws_instance.sockethub_server.public_ip
}