module.exports = {
    apps: [{
        name: "fitgen-backend",
        cwd: "/var/www/fitgen/backend",
        script: "venv/bin/gunicorn",
        args: "--bind 0.0.0.0:5000 wsgi:app",
        interpreter: "none",
        env: {
            FLASK_ENV: "production",
        }
    }]
};
