# Notepad

A simple, containerized notepad application built with Next.js and Docker.

## Features

- **Modern Stack**: Built with Next.js 14 and React.
- **Dockerized**: Fully containerized environment for consistent development and deployment.
- **Persistent Storage**: Notes are persisted using volume mapping.
- **Fast Development**: Hot-reloading enabled within the Docker container.

## Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose installed on your machine.
- [Node.js](https://nodejs.org/) (optional, for local non-Docker development).

## Getting Started

### Using Docker (Recommended)

To spin up the application using Docker Compose:

```bash
# Build and start the container in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f
```

The application will be available at [http://localhost:3000](http://localhost:3000).

To stop the application:

```bash
docker-compose down
```

### Local Development

If you prefer to run the application locally without Docker:

1. Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

2. Run the development server:
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Project Structure

- `app/` - Application routes and pages.
- `components/` - Reusable UI components.
- `lib/` - Utility functions and helpers.
- `public/` - Static assets.
- `Dockerfile` - Docker configuration for building the image.
- `docker-compose.yml` - Docker Compose configuration for orchestration.

## License

This project is open source and available under the [MIT License](LICENSE).
