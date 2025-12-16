from datetime import datetime, timezone, timedelta

# BRT - Brasília Time (UTC-3)
BRT_TZ = timezone(timedelta(hours=-3))

def now_cuiaba():
    """Retorna o horário atual em BRT (naive datetime)"""
    # Retorna datetime naive com hora de BRT para evitar conversão do PostgreSQL
    return datetime.now(BRT_TZ).replace(tzinfo=None)

def to_cuiaba(dt):
    """Converte datetime UTC para BRT"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(BRT_TZ)

def get_today_cuiaba():
    """Retorna a data de hoje em BRT"""
    return now_cuiaba().date()
