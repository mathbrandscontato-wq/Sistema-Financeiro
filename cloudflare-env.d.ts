declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    INTAKE_SHARED_SECRET?: string;
    PAYMENT_EVENTS_SECRET?: string;
    INTAKE_OWNER?: string;
    INTAKE_PUBLIC_URL?: string;
  }
}
