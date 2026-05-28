# Fitty Local Kubernetes Runbook

This runbook replaces the previous local Docker Compose runtime with a lightweight two-node Kubernetes cluster for Fitty. The cluster runs on two physical laptops using Ubuntu Server, containerd, kubeadm, kubelet, and kubectl.

The cluster hosts Fitty backend services, PostgreSQL, MongoDB, Kafka, Kafka UI, and the web app containers. Web and mobile clients must call the API Gateway; they must not connect directly to databases or Kafka.

This is a local homelab/development cluster. It is not a production high-availability cluster. There is one control-plane node and one worker node, so losing the control-plane laptop means losing cluster control until it is restored.

## Hardware Topology

| Hostname | Hardware | RAM | Kubernetes role | Example IP |
| --- | --- | ---: | --- | --- |
| `fitty-cp-01` | Intel Core i7, 6th generation, amd64 | 16 GB | Control-plane | `192.168.1.50` |
| `fitty-worker-01` | Intel Core i5, 4th generation, amd64 | 16 GB | Worker | `192.168.1.51` |

## Recommended Operating System

Use Ubuntu Server 24.04 LTS amd64 on both nodes. Use Ubuntu Server 22.04 LTS amd64 as a fallback if the older laptops show hardware or driver compatibility issues.

An LTS server distribution is preferred because it has a stable kernel/package lifecycle, fewer desktop background services, predictable security updates, and long support. Run the same Ubuntu version on both nodes where possible.

## BIOS/UEFI Requirements

Configure both laptops before installing Ubuntu:

- Enable Intel VT-x / Virtualization Technology.
- Enable VT-d if available.
- Disable Secure Boot if it causes CNI, container runtime, or kernel module issues.
- Use UEFI boot mode where possible.
- Prefer wired Ethernet and disable sleep/hibernation for cluster stability.

## Network Plan

Use wired Ethernet when possible. Give both nodes static IPs or DHCP reservations.

| Purpose | Value |
| --- | --- |
| Control-plane | `fitty-cp-01` / `192.168.1.192` |
| Worker | `fitty-worker-01` / `192.168.1.193` |
| Pod CIDR | `10.244.0.0/16` |
| Service CIDR | `10.96.0.0/12` |
| Local registry | `fitty-cp-01:5000` |

Add this to `/etc/hosts` on both nodes:

```bash
sudo tee -a /etc/hosts >/dev/null <<'EOF'
192.168.1.192 fitty-cp-01
192.168.1.193 fitty-worker-01
EOF
```

Required node ports between the two laptops:

| Port | Direction | Purpose |
| ---: | --- | --- |
| `6443/tcp` | worker -> control-plane | Kubernetes API server |
| `2379-2380/tcp` | control-plane local | etcd |
| `10250/tcp` | both ways | kubelet API |
| `10257/tcp` | control-plane local | kube-controller-manager |
| `10259/tcp` | control-plane local | kube-scheduler |
| `30000-32767/tcp` | clients -> nodes | NodePort services |
| `8472/udp` | both ways | Flannel VXLAN |
| `5000/tcp` | worker -> control-plane | local container registry |

If Ubuntu firewall is enabled, open the required ports:

```bash
sudo ufw allow 6443/tcp
sudo ufw allow 10250/tcp
sudo ufw allow 30000:32767/tcp
sudo ufw allow 8472/udp
sudo ufw allow 5000/tcp
sudo ufw reload
```

On the control-plane only:

```bash
sudo ufw allow 2379:2380/tcp
sudo ufw allow 10257/tcp
sudo ufw allow 10259/tcp
sudo ufw reload
```

## Base OS Preparation

Run this on both nodes.

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release apt-transport-https software-properties-common chrony jq
sudo systemctl enable --now chrony
timedatectl
```

Set the hostname on `fitty-cp-01`:

```bash
sudo hostnamectl set-hostname fitty-cp-01
```

Set the hostname on `fitty-worker-01`:

```bash
sudo hostnamectl set-hostname fitty-worker-01
```

Add host records on both nodes:

```bash
sudo tee -a /etc/hosts >/dev/null <<'EOF'
192.168.1.192 fitty-cp-01
192.168.1.193 fitty-worker-01
EOF
```

Disable swap on both nodes:

```bash
sudo swapoff -a
sudo sed -i.bak '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab
free -h
```

Load Kubernetes networking modules on both nodes:

```bash
sudo tee /etc/modules-load.d/k8s.conf >/dev/null <<'EOF'
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter
```

Apply sysctl settings on both nodes:

```bash
sudo tee /etc/sysctl.d/k8s.conf >/dev/null <<'EOF'
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sudo sysctl --system
```

Validate:

```bash
lsmod | grep br_netfilter
lsmod | grep overlay
sysctl net.bridge.bridge-nf-call-iptables net.ipv4.ip_forward
```

## Install containerd

Run this on both nodes.

```bash
sudo apt-get update
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml >/dev/null
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl enable --now containerd
sudo systemctl restart containerd
sudo systemctl status containerd --no-pager
```

Validate containerd:

```bash
sudo ctr version
```

## Install Kubernetes Tools

Run this on both nodes. Change `K8S_VERSION_MINOR` if you want to pin a different Kubernetes minor version.

```bash
export K8S_VERSION_MINOR=v1.36
sudo mkdir -p /etc/apt/keyrings
curl -fsSL "https://pkgs.k8s.io/core:/stable:/${K8S_VERSION_MINOR}/deb/Release.key" \
  | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/${K8S_VERSION_MINOR}/deb/ /" \
  | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
sudo systemctl enable kubelet
kubeadm version
kubelet --version
kubectl version --client
sudo crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock info
```

## Initialize Control Plane

Run this only on `fitty-cp-01`.

```bash
sudo kubeadm init \
  --node-name fitty-cp-01 \
  --pod-network-cidr=10.244.0.0/16 \
  --service-cidr=10.96.0.0/12 \
  --cri-socket unix:///var/run/containerd/containerd.sock
```

Configure kubectl for your local Linux user on `fitty-cp-01`:

```bash
mkdir -p "$HOME/.kube"
sudo cp -i /etc/kubernetes/admin.conf "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
kubectl cluster-info
```

Keep the `kubeadm join ...` command printed by `kubeadm init`. You can regenerate it later.

## Install CNI Plugin

Use Flannel as the default lightweight CNI:

```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
kubectl get pods -n kube-flannel -o wide
```

Calico is a good optional alternative when you want stronger network policy features, but Flannel is the default here because this hardware is older and the cluster is local development.

Allow app workloads on the control-plane too if you need both laptops for capacity:

```bash
kubectl taint nodes fitty-cp-01 node-role.kubernetes.io/control-plane:NoSchedule-
```

Skip that command if you want only the worker node to run application pods.

## Join Worker Node

On `fitty-cp-01`, generate a fresh join command:

```bash
kubeadm token create --print-join-command
```

Copy the generated command. It will look like this:

```bash
sudo kubeadm join 192.168.1.50:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>
```

Run the generated command on `fitty-worker-01`. Add the containerd CRI socket if it is not included:

```bash
sudo kubeadm join 192.168.1.50:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash> \
  --cri-socket unix:///var/run/containerd/containerd.sock
```

## Validate the Cluster

Run from `fitty-cp-01`:

```bash
kubectl get nodes -o wide
kubectl get pods -A
kubectl cluster-info
kubectl describe node fitty-cp-01
kubectl describe node fitty-worker-01
```

Both nodes should become `Ready`. Flannel pods should be `Running`.

## Local Image Strategy

Use a local registry on the control-plane node:

- Registry endpoint: `fitty-cp-01:5000`
- Image format: `fitty-cp-01:5000/fitty/<service-name>:local`
- Example: `fitty-cp-01:5000/fitty/api-gateway:local`

Install a small local registry on `fitty-cp-01`:

```bash
sudo apt-get install -y docker-registry
sudo systemctl enable --now docker-registry
sudo systemctl status docker-registry --no-pager
curl http://fitty-cp-01:5000/v2/_catalog
```

If `_catalog` returns `UNAUTHORIZED`, disable registry authentication for this local lab registry:

```bash
sudo cp /etc/docker/registry/config.yml /etc/docker/registry/config.yml.bak
sudo sed -i '/^[[:space:]]*auth:/,/^[^[:space:]]/ { /^[^[:space:]]/!d }' /etc/docker/registry/config.yml
sudo systemctl restart docker-registry
curl http://fitty-cp-01:5000/v2/
curl http://fitty-cp-01:5000/v2/_catalog
```

Expected output before any images are pushed:

```json
{}
{"repositories":[]}
```

Configure containerd on both nodes to use the plain HTTP local registry:

```bash
sudo mkdir -p /etc/containerd/certs.d/fitty-cp-01:5000
sudo tee /etc/containerd/certs.d/fitty-cp-01:5000/hosts.toml >/dev/null <<'EOF'
server = "http://fitty-cp-01:5000"

[host."http://fitty-cp-01:5000"]
  capabilities = ["pull", "resolve", "push"]
EOF

sudo systemctl restart containerd
sudo systemctl status containerd --no-pager
```

Build and push images from a development machine that has Docker Engine or BuildKit installed. Docker Desktop is not required and should not be used for this setup.

If your build machine uses Docker Engine and the registry is plain HTTP, configure it as an insecure local registry on the build machine:

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "insecure-registries": ["fitty-cp-01:5000"]
}
EOF
sudo systemctl restart docker
docker info | grep -A3 "Insecure Registries"
```

From the repository root:

```bash
make k8s-build-images REGISTRY=fitty-cp-01:5000 IMAGE_TAG=local
make k8s-push-images REGISTRY=fitty-cp-01:5000 IMAGE_TAG=local
```

Alternative first setup: push images to Docker Hub or GitHub Container Registry and replace image names in `infra/k8s/local/*/*.yaml`. For example:

```bash
docker tag fitty-cp-01:5000/fitty/api-gateway:local ghcr.io/<owner>/fitty/api-gateway:local
docker push ghcr.io/<owner>/fitty/api-gateway:local
```

Then update `image:` values in the manifests.

## Kubernetes Manifest Structure

The local manifests live here:

```text
infra/k8s/local/
├── namespaces/
├── configmaps/
├── secrets/
├── postgres/
├── mongo/
├── kafka/
├── api-gateway/
├── auth-service/
├── user-service/
├── health-data-service/
├── recommendation-service/
├── nutrition-service/
├── notification-service/
├── web-app/
├── ingress/
└── storage/
```

Namespaces:

- `fitty-system`
- `fitty-data`
- `fitty-app`
- `fitty-observability` optional

## Storage

Use local-path-provisioner for the first version:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
kubectl apply -f infra/k8s/local/storage/storage-class.yaml
kubectl get storageclass
```

Fitty PVCs use the `fitty-local-path` StorageClass, backed by the local-path-provisioner.

Limitations:

- Not highly available.
- Data is node-bound.
- Suitable for development/homelab only.
- If the laptop that owns a local volume is offline, that database pod cannot use its data elsewhere.

Simple hostPath/local PVs are also acceptable for a fixed lab, but local-path-provisioner is easier for repeated development.

Avoid Longhorn on this hardware unless you explicitly want to test storage platforms; it is heavier than this cluster needs.

## Ingress and Local DNS

Start with NodePort for simplicity:

| Service | URL |
| --- | --- |
| Web app | `http://fitty-cp-01:30000` |
| API Gateway | `http://fitty-cp-01:30080` |
| Kafka UI | `http://fitty-cp-01:30090` |

Add these records on your developer machine:

```bash
sudo tee -a /etc/hosts >/dev/null <<'EOF'
192.168.1.50 fitty.local api.fitty.local kafka-ui.fitty.local
EOF
```

You can add NGINX Ingress Controller later:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/baremetal/deploy.yaml
kubectl get pods -n ingress-nginx
```

Keep NodePort as the default until the base cluster is stable.

## Deploy Fitty on Kubernetes

From the repository root on a machine with `kubectl` configured for the cluster:

```bash
kubectl apply -f infra/k8s/local/namespaces/
kubectl apply -f infra/k8s/local/storage/
kubectl apply -f infra/k8s/local/configmaps/
kubectl apply -f infra/k8s/local/secrets/
kubectl apply -f infra/k8s/local/postgres/
kubectl apply -f infra/k8s/local/mongo/
kubectl apply -f infra/k8s/local/kafka/
kubectl apply -f infra/k8s/local/api-gateway/
kubectl apply -f infra/k8s/local/auth-service/
kubectl apply -f infra/k8s/local/user-service/
kubectl apply -f infra/k8s/local/health-data-service/
kubectl apply -f infra/k8s/local/recommendation-service/
kubectl apply -f infra/k8s/local/nutrition-service/
kubectl apply -f infra/k8s/local/notification-service/
kubectl apply -f infra/k8s/local/web-app/
```

Or use:

```bash
make k8s-deploy
```

Validate:

```bash
kubectl get pods -n fitty-data -o wide
kubectl get pods -n fitty-app -o wide
kubectl get svc -n fitty-data
kubectl get svc -n fitty-app
curl http://fitty-cp-01:30080/actuator/health
curl http://fitty-cp-01:30000
```

## Resource Constraints

All provided workloads include conservative requests and limits.

| Workload | Request | Limit |
| --- | --- | --- |
| Spring Boot services | `200m`, `384Mi` | `750m`, `768Mi` |
| Kafka | `500m`, `768Mi` | `1`, `1536Mi` |
| PostgreSQL | `250m`, `512Mi` | `1`, `1Gi` |
| MongoDB | `250m`, `512Mi` | `1`, `1Gi` |
| Kafka UI | `100m`, `256Mi` | `500m`, `512Mi` |
| Web app | `100m`, `128Mi` | `300m`, `256Mi` |

If pods are pending, check node memory first:

```bash
kubectl top nodes
kubectl describe node fitty-cp-01
kubectl describe node fitty-worker-01
```

If `kubectl top` is unavailable, install Metrics Server later.

## Makefile Targets

From the repository root:

```bash
make k8s-up
make k8s-build-images REGISTRY=fitty-cp-01:5000 IMAGE_TAG=local
make k8s-push-images REGISTRY=fitty-cp-01:5000 IMAGE_TAG=local
make k8s-deploy
make k8s-status
make k8s-logs
make k8s-down
```

## Troubleshooting

Check kubelet logs:

```bash
sudo journalctl -u kubelet -f
sudo journalctl -u kubelet --since "30 min ago" --no-pager
```

Check containerd logs:

```bash
sudo journalctl -u containerd -f
sudo journalctl -u containerd --since "30 min ago" --no-pager
```

Find failed pods:

```bash
kubectl get pods -A --field-selector=status.phase!=Running
kubectl get pods -A -o wide
```

Describe a pod:

```bash
kubectl describe pod -n fitty-app <pod-name>
kubectl describe pod -n fitty-data <pod-name>
```

View logs:

```bash
kubectl logs -n fitty-app deploy/api-gateway --tail=200
kubectl logs -n fitty-app deploy/auth-service --tail=200
kubectl logs -n fitty-data statefulset/kafka --tail=200
kubectl logs -n fitty-data statefulset/postgres --tail=200
kubectl logs -n fitty-data statefulset/mongo --tail=200
```

View events:

```bash
kubectl get events -A --sort-by=.lastTimestamp
kubectl get events -n fitty-app --sort-by=.lastTimestamp
kubectl get events -n fitty-data --sort-by=.lastTimestamp
```

Check node resources:

```bash
kubectl describe node fitty-cp-01
kubectl describe node fitty-worker-01
free -h
df -h
```

Check image pulls:

```bash
curl http://fitty-cp-01:5000/v2/_catalog
curl http://fitty-cp-01:5000/v2/fitty/api-gateway/tags/list
sudo crictl --runtime-endpoint unix:///var/run/containerd/containerd.sock pull fitty-cp-01:5000/fitty/api-gateway:local
```

Reset a node. This destroys Kubernetes state on that node:

```bash
sudo kubeadm reset -f
sudo systemctl stop kubelet
sudo systemctl stop containerd
sudo rm -rf /etc/cni/net.d
sudo rm -rf /var/lib/cni/
sudo rm -rf /var/lib/kubelet/
sudo rm -rf /etc/kubernetes/
sudo ip link delete cni0 || true
sudo ip link delete flannel.1 || true
sudo systemctl start containerd
sudo systemctl start kubelet
```

After resetting both nodes, initialize the control-plane again and rejoin the worker.

## Security Notes

- This is a local development cluster.
- Do not put production secrets in plain Kubernetes Secret YAML files.
- The provided `*.template.yaml` files use local development credentials only.
- Use Sealed Secrets, SOPS, or external secret management later.
- Add TLS certificates through Ingress later.
- Add NetworkPolicies later if you switch to a CNI that enforces them.
- Do not expose PostgreSQL, MongoDB, or Kafka to web/mobile clients.

## Current Fitty Access Points

After deployment:

```bash
curl http://fitty-cp-01:30080/actuator/health
curl http://fitty-cp-01:30000
```

Browser URLs:

- Web app: `http://fitty-cp-01:30000`
- API Gateway: `http://fitty-cp-01:30080`
- Kafka UI: `http://fitty-cp-01:30090`
