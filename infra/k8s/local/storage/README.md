# Storage

Install the local-path-provisioner before applying `storage-class.yaml`:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
kubectl apply -f infra/k8s/local/storage/storage-class.yaml
```

This storage is node-bound and not highly available.
