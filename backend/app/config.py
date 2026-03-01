from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    groq_api_key: str
    groq_model: str = "llama3-70b-8192"
    resend_api_key: str
    resend_from_email: str
    # Comma-separated list of allowed frontend origins, e.g.:
    # "https://elitebuilders-frontend.onrender.com,http://localhost:5173"
    frontend_url: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
