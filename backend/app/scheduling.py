from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app

from .services.campaign_service import process_pending_messages


_scheduler: BackgroundScheduler | None = None


def start_scheduler(app) -> None:
    """
    Attach APScheduler to the Flask app for periodic background sending.
    Intended to run in the same process for small deployments; for higher scale,
    use a dedicated worker process.
    """
    global _scheduler
    if _scheduler is not None or not app.config.get("SCHEDULER_ENABLED", True):
        return

    scheduler = BackgroundScheduler(timezone="UTC")

    @scheduler.scheduled_job(
        "interval", seconds=app.config.get("SCHEDULER_JOB_INTERVAL_SECONDS", 30)
    )
    def _send_pending():  # type: ignore[no-redef]
        with app.app_context():
            count = process_pending_messages()
            if count:
                current_app.logger.info("Processed %s pending messages", count)

    scheduler.start()
    _scheduler = scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        _scheduler = None

