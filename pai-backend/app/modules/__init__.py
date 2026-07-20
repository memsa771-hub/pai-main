"""Domain modules (vertical slices).

Each module owns its models, schemas, repository and service. Modules do not
import each other's internals; cross-module coordination happens in the runtime
or service layer.
"""
