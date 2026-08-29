from __future__ import annotations

from collections.abc import Iterator, Mapping, Sequence
from functools import lru_cache
from typing import Any, overload

import psycopg
from psycopg import Connection


class DatabaseRow(Mapping[str, Any]):
    """Provide the mapping and positional access used by sqlite3.Row callers."""

    def __init__(self, columns: Sequence[str], values: Sequence[Any]) -> None:
        self._columns = tuple(columns)
        self._values = tuple(values)
        self._by_name = dict(zip(self._columns, self._values, strict=True))

    @overload
    def __getitem__(self, key: str) -> Any: ...

    @overload
    def __getitem__(self, key: int) -> Any: ...

    def __getitem__(self, key: str | int) -> Any:
        if isinstance(key, int):
            return self._values[key]
        return self._by_name[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._columns)

    def __len__(self) -> int:
        return len(self._columns)


def translate_sqlite_placeholders(statement: str) -> str:
    """Translate qmark parameters without changing question marks inside SQL strings."""

    output: list[str] = []
    quote: str | None = None
    index = 0
    while index < len(statement):
        character = statement[index]
        if quote is not None:
            output.append(character)
            if character == quote:
                if index + 1 < len(statement) and statement[index + 1] == quote:
                    output.append(statement[index + 1])
                    index += 1
                else:
                    quote = None
        elif character in {"'", '"'}:
            quote = character
            output.append(character)
        elif character == "?":
            output.append("%s")
        else:
            output.append(character)
        index += 1
    return "".join(output)


class PostgresCursorAdapter:
    def __init__(self, cursor: psycopg.Cursor[Any]) -> None:
        self._cursor = cursor

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def _columns(self) -> tuple[str, ...]:
        if self._cursor.description is None:
            return tuple()
        return tuple(column.name for column in self._cursor.description)

    def fetchone(self) -> DatabaseRow | None:
        row = self._cursor.fetchone()
        return None if row is None else DatabaseRow(self._columns(), row)

    def fetchall(self) -> list[DatabaseRow]:
        columns = self._columns()
        return [DatabaseRow(columns, row) for row in self._cursor.fetchall()]


class PostgresConnectionAdapter:
    """Small DB-API compatibility boundary for the existing repository contract."""

    def __init__(self, connection: Connection[Any]) -> None:
        self._connection = connection

    def execute(
        self, statement: str, parameters: Sequence[Any] | None = None
    ) -> PostgresCursorAdapter:
        cursor = self._connection.cursor()
        cursor.execute(
            translate_sqlite_placeholders(statement),
            tuple(parameters) if parameters is not None else None,
        )
        return PostgresCursorAdapter(cursor)

    def commit(self) -> None:
        self._connection.commit()

    def rollback(self) -> None:
        self._connection.rollback()

    def close(self) -> None:
        self._connection.close()


@lru_cache(maxsize=4)
def ensure_postgres_schema(connection_url: str) -> str:
    from openforge_api.postgres_migrations import apply_postgres_migrations

    return apply_postgres_migrations(connection_url)


def connect_postgres(connection_url: str) -> PostgresConnectionAdapter:
    if not connection_url.strip():
        raise RuntimeError("PostgreSQL runtime requires OPENFORGE_NEON_DATABASE_URL")
    ensure_postgres_schema(connection_url)
    connection = psycopg.connect(connection_url, connect_timeout=10)
    return PostgresConnectionAdapter(connection)
