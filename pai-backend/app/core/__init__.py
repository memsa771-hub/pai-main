"""Core cross-cutting concerns: configuration, logging, exceptions, app lifespan.

Nothing in this package may import from higher layers (api, runtime, agents,
modules, integrations, infrastructure). It is the base of the dependency graph.
"""
