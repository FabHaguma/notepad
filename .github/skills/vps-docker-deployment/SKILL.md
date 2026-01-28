---
name: vps-docker-deployment
description: Generates Docker deployment files (Dockerfile, docker-compose.yml, nginx.conf) for VPS deployment using Nginx and Caddy. Handles multi-stage builds and database migrations.
---

# VPS Docker Deployment

This skill helps you containerize a web application (typically Frontend + Backend + DB) for deployment on a VPS, using Nginx as a reverse proxy for the frontend and Caddy as dynamic ingress controller using an external network.

## Capabilities
- Generates `Dockerfile` for Frontend (Multi-stage: Node build -> Nginx Alpine).
- Generates `Dockerfile` for Backend (e.g., Node/Python).
- Creates `client/nginx.conf` for serving static assets and proxying `/api` requests.
- Generates `docker-compose.yml` configured for the `caddy_network`.
- Handles database initialization and migration commands.

## Constraints & Conventions
- **Network**: Must use rigid external network `caddy_network`.
- **Image Naming**: Must use explicit naming scheme:
  - `client/frontend_<app_name>`
  - `server/backend_<app_name>`
- **Service Naming**: Must use unique service names in `docker-compose.yml` to avoid DNS collisions on shared networks:
  - `client_<app_name>`
  - `server_<app_name>`
- **Frontend**: Served by Nginx. API calls must be relative (e.g., `/api/v1/...`).
- **Proxy**: Nginx container acts as reverse proxy to the Backend service.

## Instructions

### 1. Analyze the Project
Identify the database (if any), frontend framework, and backend language.
- **Frontend Path**: Usually `client/` or `frontend/`.
- **Backend Path**: Usually `server/` or `backend/`.
- **App Name**: determine from directory or user input.

### 2. Frontend Dockerfile (`client/Dockerfile`)
Create a multi-stage Dockerfile:
1.  **Build Stage**: Use `node` image, install dependencies, run build (e.g., `npm run build`).
2.  **Serve Stage**: Use `nginx:alpine` (or similar lightweight).
    - Copy build artifacts to `/usr/share/nginx/html`.
    - Copy `nginx.conf` to `/etc/nginx/conf.d/default.conf`.
    - Expose port 80.

### 3. Frontend Nginx Config (`client/nginx.conf`)
Create a config that:
- Listens on port 80.
- Serves static files from `/usr/share/nginx/html`.
- **Reverse Proxy**: Forwards location `/api` to the backend service using its unique service name (e.g., `http://server_<app_name>:3000`).
- Handles SPA routing (try_files $uri /index.html).

### 4. Backend Dockerfile (`server/Dockerfile`)
Standard containerization:
- Base image (alpine/slim if possible).
- Install dependencies.
- Build (if TypeScript/etc).
- Entrypoint/CMD to start server.

### 5. Docker Compose (`docker-compose.yml`)
Create at root:
- **Services**:
  - `client_<app_name>`:
    - Build context: `./client`.
    - Image: `client/frontend_<app_name>`.
    - Networks: `caddy_network`, `internal_net` (optional).
    - Depends on: `server_<app_name>`.
  - `server_<app_name>`:
    - Build context: `./server`.
    - Image: `server/backend_<app_name>`.
    - Networks: `caddy_network` (if needed) or internal.
    - Note: Use unique service names (e.g. `server_myapp`) instead of generic `server` to prevent DNS conflicts on the shared `caddy_network`.
- **Networks**:
  - `caddy_network`: external: true.

### 6. Database (Optional)
If a database is detected:
- Add service (postgres/mysql).
- Add volume for persistence.
- Add migration steps in Backend `CMD` or a separate `init` container.

## Examples

### docker-compose.yml
```yaml
services:
  client_myapp:
    image: client/frontend_myapp
    build: ./client
    networks:
      - caddy_network
    restart: unless-stopped
    depends_on:
      - server_myapp

  server_myapp:
    image: server/backend_myapp
    build: ./server
    networks:
      - caddy_network
    restart: unless-stopped
    environment:
      - PORT=3000

networks:
  caddy_network:
    external: true
```
