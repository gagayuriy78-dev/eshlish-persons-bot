---
name: Python packaging in the monorepo
description: How to keep setuptools from treating sibling workspace folders as Python packages
---

When a Python project shares a repository with top-level workspace folders, configure setuptools with an explicit module or package list instead of relying on automatic flat-layout discovery.

**Why:** Automatic discovery can interpret unrelated folders as Python packages and block dependency installation while building the local project.

**How to apply:** For a single-file Python app, use an explicit `py-modules` entry in `pyproject.toml`; use an explicit package discovery configuration for a multi-package Python app.