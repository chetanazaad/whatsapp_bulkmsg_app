import os
from datetime import timedelta


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        # Example: mysql+mysqlconnector://user:pass@localhost:3306/whatsapp_saas
        "mysql+mysqlconnector://user:password@localhost:3306/whatsapp_saas",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-too")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=4)

    WHATSAPP_API_BASE_URL = os.getenv(
        "WHATSAPP_API_BASE_URL",
        "https://graph.facebook.com/v21.0",
    )
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")

    SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"
    SCHEDULER_JOB_INTERVAL_SECONDS = int(os.getenv("SCHEDULER_JOB_INTERVAL_SECONDS", "30"))

    # e.g. https://chetanazaad.github.io (or "*" for dev)
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


config_by_name = {
    "dev": DevelopmentConfig,
    "prod": ProductionConfig,
}


def get_config():
    env = os.getenv("FLASK_ENV", "dev")
    return config_by_name.get(env, DevelopmentConfig)

