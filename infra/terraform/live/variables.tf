variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.40.0.0/16"
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

variable "eks_api_allowed_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "general_instance_types" {
  type    = list(string)
  default = ["t3.large"]
}

variable "general_min_size" {
  type    = number
  default = 2
}

variable "general_max_size" {
  type    = number
  default = 4
}

variable "use_spot" {
  type    = bool
  default = false
}

variable "ai_instance_type" {
  type    = string
  default = "m6i.xlarge"
}

variable "ai_ami_type" {
  type    = string
  default = "AL2023_x86_64_STANDARD"
}

variable "rds_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "msk_broker_count" {
  type    = number
  default = 2
}

variable "msk_instance_type" {
  type    = string
  default = "kafka.t3.small"
}
