# Skillshub Frontend – Docker Execution Guide

This document describes how to run the **Skillshub Frontend** using Docker, depending on where the **Gateway** service
is executed.  
It provides two Docker Compose configurations for local development and full Docker integration.

---

## 1. Overview

The frontend is always executed inside a Docker container.  
Only the Gateway location changes depending on the development mode.

| Mode                    | Frontend | Gateway   | Keycloak | Typical Use                                       |
|-------------------------|----------|-----------|----------|---------------------------------------------------|
| **Local Gateway Mode**  | Docker   | Localhost | Docker   | Debugging the Gateway locally                     |
| **Docker Gateway Mode** | Docker   | Docker    | Docker   | Full integration testing on shared Docker network |

---

## 2. Folder Structure

```
frontend/
│
├─ docker-compose.local.yml
├─ docker-compose.docker.yml
├─ Dockerfile.dev
└─ env/
   └─ dev/
       ├─ local-gateway.env
       └─ docker-gateway.env
```

Each mode uses its own `.env` file located under `env/dev/`.  
These files define runtime variables.

---

## 3. Prerequisites

Before starting the containers, ensure the shared Docker network exists.  
This network is required when the Gateway also runs in Docker.

if required network doesn't created execute this

```bash
docker network create skillshub-net
```

You can check existing networks with:

```bash
docker network ls
```

---

## 4. Execution Modes

### 4.1 Local Gateway Mode

In this mode, the frontend runs in Docker, while the Gateway runs locally on the host machine.

**Purpose:**  
Use this configuration when actively debugging or modifying the Gateway code on localhost.

**Command:**

```bash
docker compose -f docker-compose.local.yml up --build
```

**Compose file:**  
`docker-compose.local.yml`  
This configuration does not attach the container to the shared Docker network.

---

### 4.2 Docker Gateway Mode

In this mode, both the frontend and the Gateway run inside Docker and communicate through the shared network
`skillshub-net`.

**Purpose:**  
Use this configuration for end-to-end testing or integration validation in a full Docker environment.

**Command:**

```bash
docker compose -f docker-compose.docker.yml up --build
```

**Compose file:**  
`docker-compose.docker.yml`  
This configuration attaches the frontend container to the shared `skillshub-net` network.

---

## 5. Stopping Containers

To stop and remove running containers:

```bash
docker compose -f docker-compose.local.yml down
# or
docker compose -f docker-compose.docker.yml down
```

If you need to clean up all unused containers, networks, and images:

```bash
docker system prune -f
```

---

## 6. Summary

| Mode           | Compose File                | Network           | Use Case                        |
|----------------|-----------------------------|-------------------|---------------------------------|
| Local Gateway  | `docker-compose.local.yml`  | None (local only) | Debug Gateway locally           |
| Docker Gateway | `docker-compose.docker.yml` | `skillshub-net`   | Run full integrated environment |

---

## 7. Troubleshooting

### Network not found

If you see an error like:

```
Error: network skillshub-net not found
```

Create it manually:

```bash
docker network create skillshub-net
```

### Port already in use

If you encounter:

```
Bind for 0.0.0.0:5173 failed: port is already allocated
```

Stop the process using that port or change the exposed port in your `docker-compose` file.

### Environment variables not applied

Ensure each compose file correctly references the appropriate `.env` file under `env/dev/`.  
You can verify active environment variables inside the container with:

```bash
docker exec -it skillshub-front-dev printenv
```

---

## 8. Notes

- The `.env` files are only used to define runtime URLs and environment context.
- Do **not** store credentials or tokens in these files.
- Both Docker Compose configurations can coexist in the same repository for easy switching between modes.
- This setup ensures predictable, isolated frontend behavior in both local and full Docker environments.

---

**Maintained by:** Skillshub Project  
**Last Updated:** November 2025
