"""Infrastructure: shared technical resources (database, HTTP client, cache).

Depends only on `core`. Higher layers obtain these resources via the app
lifespan / dependencies rather than constructing them per request.
"""
