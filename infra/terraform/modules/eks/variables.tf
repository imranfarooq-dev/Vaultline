variable "name" {
  type = string
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "api_allowed_cidrs" {
  type        = list(string)
  default     = ["0.0.0.0/0"]
  description = "Who may reach the Kubernetes API. Set to your office/VPN IP in real environments."
}

variable "general_instance_types" {
  type    = list(string)
  default = ["t3.large"]
}
