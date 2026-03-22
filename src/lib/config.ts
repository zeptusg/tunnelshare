import { z } from "zod";
import { defaultMaxUploadFileBytes } from "@/lib/upload-policy";

const configSchema = z.object({
    appUrl: z.string().url("APP_URL must be a valid URL"),
    redisUrl: z.string().url("REDIS_URL must be a valid URL"),
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

    return result.data;
}

export const config = loadConfig();
