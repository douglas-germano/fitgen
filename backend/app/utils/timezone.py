from datetime import datetime, timezone, timedelta

# Cuiabá - America/Cuiaba (UTC-4)
CUIABA_TZ = timezone(timedelta(hours=-4))

def now_cuiaba():
    """Retorna o horário atual em Cuiabá (naive datetime)"""
    # Retorna datetime naive com hora de Cuiabá para evitar conversão do PostgreSQL
    return datetime.now(CUIABA_TZ).replace(tzinfo=None)

def to_cuiaba(dt):
    """Converte datetime UTC para Cuiabá"""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(CUIABA_TZ)

def get_today_cuiaba():
    """Retorna a data de hoje em Cuiabá"""
    return now_cuiaba().date()
