import { z } from "zod";
import { defaultMaxUploadFileBytes } from "@/lib/upload-policy";

const configSchema = z.object({
    appUrl: z.string().url("APP_URL must be a valid URL"),
    redisUrl: z.string().url("REDIS_URL must be a valid URL"),
    fileStorageDriver: z.enum(["local", "supabase"]).default("local"),
    supabaseUrl: z.string().url("SUPABASE_URL must be a valid URL").optional(),
    supabaseServiceRoleKey: z
        .string()
        .min(1, "SUPABASE_SERVICE_ROLE_KEY cannot be empty")
        .optional(),
    supabaseBucket: z.string().min(1, "SUPABASE_BUCKET cannot be empty").optional(),
    sessionTtlSeconds: z.coerce
        .number()
        .int("SESSION_TTL_SECONDS must be an integer")
        .positive("SESSION_TTL_SECONDS must be positive"),
    maxTextBytes: z.coerce
        .number()
        .int("MAX_TEXT_BYTES must be an integer")
        .positive("MAX_TEXT_BYTES must be positive"),
    maxUploadFileBytes: z.coerce
        .number()
        .int("MAX_UPLOAD_FILE_BYTES must be an integer")
        .positive("MAX_UPLOAD_FILE_BYTES must be positive")
        .default(defaultMaxUploadFileBytes),
    maxUploadFiles: z.coerce
        .number()
        .int("MAX_UPLOAD_FILES must be an integer")
        .positive("MAX_UPLOAD_FILES must be positive")
        .default(5),
});

type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
    const raw = {
        appUrl: process.env.APP_URL,
        redisUrl: process.env.REDIS_URL,
        fileStorageDriver: process.env.FILE_STORAGE_DRIVER,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseBucket: process.env.SUPABASE_BUCKET,
        sessionTtlSeconds: process.env.SESSION_TTL_SECONDS,
        maxTextBytes: process.env.MAX_TEXT_BYTES,
        maxUploadFileBytes: process.env.MAX_UPLOAD_FILE_BYTES,
        maxUploadFiles: process.env.MAX_UPLOAD_FILES,
    };

    const result = configSchema.safeParse(raw);

    if (!result.success) {
        const errors = result.error.flatten();
        console.error("Configuration validation failed:", errors);
        throw new Error(
            `Invalid environment configuration: ${JSON.stringify(errors.fieldErrors)}`
        );
    }

    if (result.data.fileStorageDriver === "supabase") {
        if (
            !result.data.supabaseUrl ||
            !result.data.supabaseServiceRoleKey ||
            !result.data.supabaseBucket
        ) {
            throw new Error(
                "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_BUCKET are required when FILE_STORAGE_DRIVER=supabase"
            );
        }
    }

    return result.data;
}

export const config = loadConfig();
