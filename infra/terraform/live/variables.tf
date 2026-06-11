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
