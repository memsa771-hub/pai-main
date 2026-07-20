"""Runtime: request orchestration, routing, agent registry and shared context.

The runtime coordinates agents (only the orchestrator/pipeline may do so) and
builds the per-request context once. This package depends on core,
infrastructure, integrations and agents — never on the api layer.
"""
