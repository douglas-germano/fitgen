import py_compile
try:
    py_compile.compile('/var/www/fitgen/backend/app/modules/training/application/workout_generator.py', doraise=True)
    print("Syntax OK")
except Exception as e:
    print(f"Syntax Error: {e}")
