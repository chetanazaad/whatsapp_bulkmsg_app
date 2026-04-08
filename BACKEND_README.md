## WhatsApp Bulk Messaging Backend (Flask)

This backend is a modular, production-style Flask API for a SaaS WhatsApp bulk messaging platform. It is designed to pair with the existing frontend in this repo.

### Stack

- **Framework**: Flask
- **DB**: MySQL (via SQLAlchemy + `mysql-connector-python`)
- **Auth**: JWT (`flask-jwt-extended`) + bcrypt
- **Scheduler**: APScheduler (simple in-process job for sending pending messages)
- **WhatsApp**: Official WhatsApp Cloud API (HTTP wrapper in `whatsapp_client.py`)

### Project structure

- `backend/app/__init__.py` – Flask app factory, error handling, blueprint registration, scheduler bootstrap
- `backend/app/config.py` – environment-based configuration
- `backend/app/extensions.py` – DB, bcrypt, JWT instances
- `backend/app/models.py` – `User`, `Contact`, `Template`, `Campaign`, `CampaignContact`, `MessageLog`
- `backend/app/routes/` – REST endpoints:
  - `auth.py` – `/auth/register`, `/auth/login`
  - `user.py` – `/user/profile`
  - `contacts.py` – `/contacts`, `/contacts/upload`, `/contacts` (GET)
  - `campaigns.py` – `/campaigns`, `/campaigns/send`, `/campaigns` (GET)
  - `templates.py` – `/templates`
  - `logs.py` – `/logs`
- `backend/app/services/whatsapp_client.py` – WhatsApp Cloud API wrapper
- `backend/app/services/campaign_service.py` – campaign creation + message enqueueing and sending
- `backend/app/scheduling.py` – APScheduler integration to process pending messages on an interval
- `backend/wsgi.py` – entrypoint for running the API

### Database schema (high level)

- `users`
  - `id`, `email`, `password_hash`, `full_name`, `whatsapp_api_key`
  - timestamps
- `contacts`
  - `id`, `user_id`, `name`, `phone_number`, `country_code`, `is_opt_in`
  - timestamps
- `templates`
  - `id`, `user_id`, `name`, `category`, `language_code`, `body`, `variable_schema` (JSON)
  - timestamps
- `campaigns`
  - `id`, `user_id`, `name`, `description`, `template_id`, `status`, `scheduled_at`
  - timestamps
- `campaign_contacts`
  - `id`, `campaign_id`, `contact_id`
  - timestamps
- `message_logs`
  - `id`, `campaign_id`, `contact_id`, `user_id`, `template_id`
  - `to_phone`, `status`, `whatsapp_message_id`, `error_message`, `payload` (JSON), `sent_at`
  - timestamps

### Running locally

1. **Install dependencies**

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

2. **Configure environment**

Copy `.env.example` to `.env` and fill in values:

- `DATABASE_URL` – MySQL URL using `mysql+mysqlconnector`
- `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` – from WhatsApp Cloud API

3. **Run the API**

```bash
cd backend
python wsgi.py
```

The API will start at `http://localhost:5000`.

On first run, tables are created automatically via `db.create_all()` in `create_app()`.

### Key endpoints (REST)

- `POST /auth/register` – register user (`email`, `password`, `full_name`)
- `POST /auth/login` – login, returns JWT `access_token`
- `GET /user/profile` – authenticated profile
- `PUT /user/profile` – update name and stored WhatsApp API key
- `POST /contacts` – add single contact
- `POST /contacts/upload` – CSV upload (`file`, columns: `name`, `phone_number`, `country_code`, `is_opt_in`)
- `GET /contacts` – list contacts (`?only_opt_in=true` optional)
- `POST /templates` – create template (name, body, category, language_code, variable_schema)
- `GET /templates` – list templates
- `POST /campaigns` – create campaign + enqueue messages (name, template_id, contact_ids, variables, scheduled_at)
- `POST /campaigns/send` – trigger send for an existing campaign
- `GET /campaigns` – list campaigns
- `GET /logs` – list message logs (`?status=pending|sent|failed`)
- `GET /health` – health check

All non-auth routes are protected with JWT (`Authorization: Bearer <token>`).

### Background sending

- Pending messages are created as `MessageLog` rows with `status="pending"`.
- `APScheduler` runs `process_pending_messages()` every `SCHEDULER_JOB_INTERVAL_SECONDS`.
- Each run:
  - fetches a batch of pending messages
  - sends via WhatsApp Cloud API
  - updates `status`, `sent_at`, `whatsapp_message_id` or `error_message`

For higher scale, you can:

- run the same Flask app as a **worker-only** process that imports `process_pending_messages()` and loops, or
- replace APScheduler with Celery/RQ and reuse the same service functions.

### Security considerations

- Passwords are hashed using bcrypt (`flask-bcrypt`).
- JWT secrets and DB/WhatsApp credentials are taken from environment variables.
- SQLAlchemy ORM protects from SQL injection when used as shown.
- Input is validated in route handlers with simple required-field checks; you can add Marshmallow or Pydantic on top for stricter validation if needed.

