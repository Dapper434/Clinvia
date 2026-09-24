from datetime import date, datetime, time


def parse_date(value):
    """Coerce an incoming 'YYYY-MM-DD' string (or date/datetime) into a date object.

    SQLAlchemy's Date columns need real date objects for comparisons and inserts;
    passing a raw string through causes Postgres to reject the query with a
    type mismatch (date = character varying).
    """
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(str(value)[:10])


def parse_time(value):
    """Coerce an 'HH:MM' string into a time object; '' / None clear it. Raises ValueError if malformed."""
    if value is None or value == "":
        return None
    hours, minutes = str(value).split(":")[:2]
    return time(int(hours), int(minutes))
