from __future__ import annotations

import hashlib
import sqlite3
from collections import defaultdict
from dataclasses import dataclass


@dataclass(frozen=True)
class PostgresSchemaPlan:
    schema_signature: str
    table_names: tuple[str, ...]
    create_table_statements: tuple[str, ...]
    foreign_key_statements: tuple[str, ...]
    unique_index_statements: tuple[str, ...]

    @property
    def statement_count(self) -> int:
        return (
            len(self.create_table_statements)
            + len(self.foreign_key_statements)
            + len(self.unique_index_statements)
        )


@dataclass(frozen=True)
class PostgresDataLoadPlan:
    schema_signature: str
    table_names: tuple[str, ...]
    insert_order: tuple[str, ...]
    verification_order: tuple[str, ...]
    dependency_edges: tuple[tuple[str, str], ...]


def quote_identifier(identifier: str) -> str:
    if not identifier or "\x00" in identifier:
        raise ValueError("Invalid SQL identifier")
    escaped_identifier = identifier.replace('"', '""')
    return f'"{escaped_identifier}"'


def sqlite_type_to_postgres(sqlite_type: str) -> str:
    normalized = sqlite_type.strip().upper()
    if not normalized:
        return "TEXT"
    if "INT" in normalized:
        return "INTEGER"
    if any(token in normalized for token in ("CHAR", "CLOB", "TEXT")):
        return "TEXT"
    if "BLOB" in normalized:
        return "BYTEA"
    if any(token in normalized for token in ("REAL", "FLOA", "DOUB")):
        return "DOUBLE PRECISION"
    if any(token in normalized for token in ("NUM", "DEC", "BOOL", "DATE", "TIME")):
        return "TEXT"
    return "TEXT"


def normalize_default(default_value: object) -> str | None:
    if default_value is None:
        return None
    text = str(default_value).strip()
    if not text:
        return None
    return text


def list_sqlite_table_names(connection: sqlite3.Connection) -> tuple[str, ...]:
    rows = connection.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()
    return tuple(str(row["name"]) for row in rows)


def build_create_table_statement(
    connection: sqlite3.Connection, table_name: str
) -> str:
    columns = connection.execute(
        f"PRAGMA table_info({quote_identifier(table_name)})"
    ).fetchall()
    if not columns:
        raise ValueError(f"Cannot build PostgreSQL table with no columns: {table_name}")

    primary_key_columns = [
        str(row["name"])
        for row in sorted(columns, key=lambda row: int(row["pk"] or 0))
        if row["pk"]
    ]
    lines: list[str] = []
    for row in columns:
        column_name = str(row["name"])
        column_type = sqlite_type_to_postgres(str(row["type"] or ""))
        parts = [quote_identifier(column_name), column_type]
        if row["notnull"]:
            parts.append("NOT NULL")
        default_value = normalize_default(row["dflt_value"])
        if default_value is not None:
            parts.extend(["DEFAULT", default_value])
        lines.append("  " + " ".join(parts))

    if primary_key_columns:
        quoted_primary_key = ", ".join(quote_identifier(name) for name in primary_key_columns)
        lines.append(f"  PRIMARY KEY ({quoted_primary_key})")

    return (
        f"CREATE TABLE IF NOT EXISTS {quote_identifier(table_name)} (\n"
        + ",\n".join(lines)
        + "\n);"
    )


def normalize_referential_action(action: object) -> str:
    text = str(action or "").strip().upper()
    if text in {"CASCADE", "SET NULL", "SET DEFAULT", "RESTRICT", "NO ACTION"}:
        return text
    return "NO ACTION"


def build_foreign_key_statements(
    connection: sqlite3.Connection, table_name: str
) -> tuple[str, ...]:
    rows = connection.execute(
        f"PRAGMA foreign_key_list({quote_identifier(table_name)})"
    ).fetchall()
    grouped: dict[int, list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        grouped[int(row["id"])].append(row)

    statements: list[str] = []
    for foreign_key_id, group in sorted(grouped.items()):
        ordered_group = sorted(group, key=lambda row: int(row["seq"]))
        referenced_table = str(ordered_group[0]["table"])
        from_columns = ", ".join(quote_identifier(str(row["from"])) for row in ordered_group)
        to_columns = ", ".join(quote_identifier(str(row["to"])) for row in ordered_group)
        on_delete = normalize_referential_action(ordered_group[0]["on_delete"])
        on_update = normalize_referential_action(ordered_group[0]["on_update"])
        constraint_name = quote_identifier(f"fk_{table_name}_{foreign_key_id}")
        statements.append(
            f"ALTER TABLE {quote_identifier(table_name)}\n"
            f"  ADD CONSTRAINT {constraint_name}\n"
            f"  FOREIGN KEY ({from_columns})\n"
            f"  REFERENCES {quote_identifier(referenced_table)} ({to_columns})\n"
            f"  ON UPDATE {on_update} ON DELETE {on_delete};"
        )
    return tuple(statements)


def build_unique_index_statements(
    connection: sqlite3.Connection, table_name: str
) -> tuple[str, ...]:
    index_rows = connection.execute(
        f"PRAGMA index_list({quote_identifier(table_name)})"
    ).fetchall()
    statements: list[str] = []
    for index_row in index_rows:
        if not index_row["unique"] or str(index_row["origin"]) == "pk":
            continue
        source_index_name = str(index_row["name"])
        column_rows = connection.execute(
            f"PRAGMA index_info({quote_identifier(source_index_name)})"
        ).fetchall()
        if not column_rows:
            continue
        column_names = tuple(
            str(row["name"]) for row in sorted(column_rows, key=lambda row: int(row["seqno"]))
        )
        index_fingerprint = hashlib.sha1(
            f"{table_name}:{','.join(column_names)}".encode("utf-8")
        ).hexdigest()[:8]
        index_name = f"uniq_{table_name}_{index_fingerprint}"
        quoted_columns = ", ".join(
            quote_identifier(column_name) for column_name in column_names
        )
        statements.append(
            f"CREATE UNIQUE INDEX IF NOT EXISTS {quote_identifier(index_name)}\n"
            f"  ON {quote_identifier(table_name)} ({quoted_columns});"
        )
    return tuple(statements)


def build_postgres_schema_plan(connection: sqlite3.Connection) -> PostgresSchemaPlan:
    table_names = list_sqlite_table_names(connection)
    create_table_statements = tuple(
        build_create_table_statement(connection, table_name) for table_name in table_names
    )
    foreign_key_statements = tuple(
        statement
        for table_name in table_names
        for statement in build_foreign_key_statements(connection, table_name)
    )
    unique_index_statements = tuple(
        statement
        for table_name in table_names
        for statement in build_unique_index_statements(connection, table_name)
    )
    signature_source = "\n\n".join(
        (*create_table_statements, *foreign_key_statements, *unique_index_statements)
    )
    schema_signature = hashlib.sha256(signature_source.encode("utf-8")).hexdigest()
    return PostgresSchemaPlan(
        schema_signature=schema_signature,
        table_names=table_names,
        create_table_statements=create_table_statements,
        foreign_key_statements=foreign_key_statements,
        unique_index_statements=unique_index_statements,
    )


def list_table_dependencies(
    connection: sqlite3.Connection, table_names: tuple[str, ...]
) -> tuple[tuple[str, str], ...]:
    known_tables = set(table_names)
    edges: set[tuple[str, str]] = set()
    for table_name in table_names:
        foreign_key_rows = connection.execute(
            f"PRAGMA foreign_key_list({quote_identifier(table_name)})"
        ).fetchall()
        for row in foreign_key_rows:
            parent_table = str(row["table"])
            if parent_table in known_tables:
                edges.add((parent_table, table_name))
    return tuple(sorted(edges))


def topological_insert_order(
    table_names: tuple[str, ...], dependency_edges: tuple[tuple[str, str], ...]
) -> tuple[str, ...]:
    remaining = set(table_names)
    parents_by_child: dict[str, set[str]] = {table_name: set() for table_name in table_names}
    children_by_parent: dict[str, set[str]] = {table_name: set() for table_name in table_names}
    for parent_table, child_table in dependency_edges:
        parents_by_child[child_table].add(parent_table)
        children_by_parent[parent_table].add(child_table)

    ordered: list[str] = []
    ready = sorted(table_name for table_name in table_names if not parents_by_child[table_name])
    while ready:
        table_name = ready.pop(0)
        if table_name not in remaining:
            continue
        ordered.append(table_name)
        remaining.remove(table_name)
        for child_table in sorted(children_by_parent[table_name]):
            parents_by_child[child_table].discard(table_name)
            if not parents_by_child[child_table]:
                ready.append(child_table)
        ready = sorted(set(ready))

    if remaining:
        ordered.extend(sorted(remaining))
    return tuple(ordered)


def build_postgres_data_load_plan(connection: sqlite3.Connection) -> PostgresDataLoadPlan:
    schema_plan = build_postgres_schema_plan(connection)
    dependency_edges = list_table_dependencies(connection, schema_plan.table_names)
    insert_order = topological_insert_order(schema_plan.table_names, dependency_edges)
    return PostgresDataLoadPlan(
        schema_signature=schema_plan.schema_signature,
        table_names=schema_plan.table_names,
        insert_order=insert_order,
        verification_order=schema_plan.table_names,
        dependency_edges=dependency_edges,
    )
