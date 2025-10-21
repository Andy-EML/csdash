import { z } from "zod";

// Public environment variables (required for all environments)
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

// Service role key (only required for API routes using service client)
const serviceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for service client"),
});

type PublicEnv = z.infer<typeof publicEnvSchema>;
type ServiceEnv = z.infer<typeof serviceEnvSchema>;

function validatePublicEnv(): PublicEnv {
  try {
    return publicEnvSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `  - ${issue.path.join(".")}: ${issue.message}`;
      });

      throw new Error(
        `Environment variable validation failed:\n${issues.join("\n")}\n\nPlease check your .env.local file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

function validateServiceEnv(): ServiceEnv {
  try {
    return serviceEnvSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `  - ${issue.path.join(".")}: ${issue.message}`;
      });

      throw new Error(
        `Service role key validation failed:\n${issues.join("\n")}\n\nThis is required for API routes. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.`
      );
    }
    throw error;
  }
}

// Validate public environment variables on module load
const publicEnv = validatePublicEnv();

// Export combined env object with lazy service role validation
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return validateServiceEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
};
