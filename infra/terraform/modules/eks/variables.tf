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
  type        = string
  default     = "m6i.xlarge"
  description = "4 vCPU / 16 GiB runs llama3.2:1b on CPU. Use g5.xlarge (+ ai_ami_type) for GPU."
}

variable "ai_ami_type" {
  type    = string
  default = "AL2023_x86_64_STANDARD"
}
