# Cacti Starter: Minimal Onboarding Template

Welcome to the Hyperledger Cacti Starter! This template provides the simplest possible "Hello World" experience for new contributors. It demonstrates Level 2 architecture (API Server + Plugin) with minimal setup.

## 🚀 Quick Start

```bash
cd examples/cacti-starter
./bootstrap.sh
./run.sh
```

- Swagger UI: [http://127.0.0.1:4000/api/v1/api-docs/](http://127.0.0.1:4000/api/v1/api-docs/)

## 🧪 Test the Keychain Plugin

In a new terminal:

```bash
./test.sh
```

## 🏗️ Architecture

- **API Server**: Runs the Cacti REST API
- **Plugin**: Only `@hyperledger/cactus-plugin-keychain-memory` is loaded
- **No JWT, No TLS**: Authentication and encryption are disabled for simplicity

```
+-------------------+
|  API Server       |
|-------------------|
| Keychain Plugin   |
+-------------------+
```

## 📄 Purpose

- Help new contributors get started in minutes
- Provide a working, hackable Cacti setup
- Avoid all unnecessary complexity

---

**Happy hacking!**
