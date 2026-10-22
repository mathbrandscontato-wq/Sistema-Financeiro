declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    INTAKE_SHARED_SECRET?: string;
    PAYMENT_EVENTS_SECRET?: string;
    INTAKE_OWNER?: string;
    INTAKE_PUBLIC_URL?: string;
    COMMERCIAL_OWNER?: string;
    COMMERCIAL_EXTERNAL_APPROVED?: string;
    COMMERCIAL_ACTIVATION_REFERENCE?: string;
    COMMERCIAL_PRODUCTION_APPROVED?: string;
    COMMERCIAL_ENVIRONMENT?: string;
    COMMERCIAL_ALLOW_SIMULATIONS?: string;
    COMMERCIAL_SCHEDULER_ENABLED?: string;
    COMMERCIAL_JOB_SECRET?: string;
    META_APP_SECRET?: string;
    META_VERIFY_TOKEN?: string;
    META_PHONE_NUMBER_ID?: string;
    META_WABA_ID?: string;
    META_GRAPH_VERSION?: string;
    META_ACCESS_TOKEN?: string;
    OPENAI_API_KEY?: string;
    COMMERCIAL_AI_MODEL?: string;
    RESEND_API_KEY?: string;
    COMMERCIAL_EMAIL_FROM?: string;
    GOOGLE_PLACES_API_KEY?: string;
    COMMERCIAL_PIX_VALIDATED?: string;
    COMMERCIAL_PIX_PAYLOAD?: string;
    COMMERCIAL_PIX_KEY?: string;
    COMMERCIAL_PIX_REFERENCE?: string;
  }
}
