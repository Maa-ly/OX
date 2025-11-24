# ODX Nautilus AnimeList Enclave Deployment Guide

This guide walks you through deploying and running Nautilus (with the
MyAnimeList endpoint) on AWS EC2 using Nitro Enclaves. It is tailored
for first-time users who have cloned the repo.

---

## Prerequisites

- **AWS Account** with EC2 and IAM permissions.
- **EC2 Instance Type:** Must be Nitro Enclaves-compatible (e.g., `c6i.xlarge`, `m5.large`).
- **AMI:** Amazon Linux 2 (x86, HVM, SSD Volume Type)
- **Storage:** At least 16 GB root volume.
- **Enable Nitro Enclaves** when launching the EC2 instance.

## Launching Your EC2 Instance

1. Go to the AWS Console → EC2 → Launch Instance.
2. Select **Amazon Linux 2 AMI (HVM), SSD Volume Type** (**64-bit x86**).
3. Choose an instance type compatible with Nitro Enclaves (e.g., `c6i.xlarge`, `m5.large`).
4. Set **root volume size** to at least 16 GB.
5. Assign your instance to a subnet in your chosen VPC.
6. On the “Advanced Details” or “Enclave” section, **Enable Nitro Enclaves**.
7. Attach a Security Group that allows SSH (`port 22`) from your location.
8. Launch and note your **Key Pair** name for SSH access.

## Connect to Your EC2 Instance

```bash
ssh -i <your-key>.pem ec2-user@<your-instance-public-ip>
```

## Install Required Tools

```bash
# System update
sudo yum update -y

# Essential packages
sudo yum install -y git jq docker nitro-enclaves-allocator nitro-enclaves-cli

# Optional, but recommended:
# Install rust and cargo
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install yq (YAML processor)
sudo wget https://github.com/mikefarah/yq/releases/download/v4.40.5/yq_linux_amd64 -O /usr/local/bin/yq
sudo chmod +x /usr/local/bin/yq
```

## Prepare Docker

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# (Logout and back in if needed to refresh group)
```

## Allocate CPUs and Memory for Nitro Enclaves

```bash
sudo /etc/nitro_enclaves/allocate-cpus --cpus 2 --memory 512
sudo systemctl restart nitro-enclaves-allocator
sudo systemctl status nitro-enclaves-allocator
```

## Clone the Repo

```bash
git clone https://github.com/Maa-ly/OX.git
cd OX/nautilus-server
```

## Configure the Enclave App

```bash
export KEY_PAIR=<your-key-pair>
./configure_enclave.sh myanimelist
```
- When prompted, enter a **base name** (e.g., `nautilus-server`).
- When asked about AWS secrets, choose `n` unless you use AWS Secrets Manager.

## Build the Enclave Image (EIF)

```bash
make ENCLAVE_APP=myanimelist MAL_CLIENT_ID=<your-myanimelist-client-id> MAL_BEARER_TOKEN=<your-myanimelist-bearer-token>
```
- Replace placeholders with your actual MyAnimeList API credentials.

## Run the Enclave (Debug Mode Recommended)

```bash
make run-debug
```
- This command starts the enclave, attaches the console, and outputs logs.
- For non-debug, use:
  ```bash
  make run
  ```

## Test Your Endpoint

Once the enclave boots, the server listens on port `3000` by default.

Example request (POST to the `process_data` route used by the app):

```bash
curl -X POST http://localhost:3000/process_data \
  -H 'Content-Type: application/json' \
  -d '{"app":"myanimelist","q":"Naruto"}'
```

- You should get JSON results from MyAnimeList via the secure enclave.

---

## Troubleshooting

- If you get `Permission denied (os error 13)` on `/run.sh`, ensure `run.sh` in your project root is executable:
  ```bash
  chmod +x run.sh
  ```
  Then clean and rebuild:
  ```bash
  make clean
  make ENCLAVE_APP=myanimelist MAL_CLIENT_ID=<...> MAL_BEARER_TOKEN=<...>
  ```

- If you get “No space left on device,” expand your root volume size (see AWS documentation for details).

- For Docker errors, restart with:
  ```bash
  sudo systemctl restart docker
  ```

---

## Useful Commands

```bash
# Check available disk space
df -h

# List running Docker containers
docker ps

# Check Nitro Enclaves logs (host)
sudo cat /var/log/nitro_enclaves/err*.log
```

---

## Additional Resources

- [Nautilus repo](https://github.com/Maa-ly/OX)
- [AWS Nitro Enclaves docs](https://docs.aws.amazon.com/enclaves/latest/user/what-is-nitro-enclaves.html)

---

> This guide is for first-time deployers of Nautilus MyAnimeList endpoints.  
> For custom integrations or advanced enclave features, see the repo README or open issues.

***

**adjust client ID/token details, endpoint path/port, and repo links as needed for your specific project setup!**
