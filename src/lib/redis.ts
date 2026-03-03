import { createClient } from "redis";
import { config } from "@/lib/config";

type RedisClientType = ReturnType<typeof createClient>;

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

async function getClient(): Promise<RedisClientType> {
    if (client?.isOpen) {
        return client;
    }

    if (connectPromise) {
        return connectPromise;
    }

    connectPromise = (async (): Promise<RedisClientType> => {
        const newClient = createClient({
            url: config.redisUrl,
        });

        newClient.on("error", (err) => {
            console.error("Redis client error:", err);
        });

        try {
            await newClient.connect();
            client = newClient;
            return newClient;
        } catch (error) {
            await newClient.disconnect().catch(() => {
                // best-effort cleanup
            });
            throw error;
        } finally {
            connectPromise = null;
        }
    })();

    return connectPromise;
}

export async function setJson<T>(
    key: string,
    value: T,
    ttlSeconds: number
): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
        throw new Error("ttlSeconds must be a positive integer");
    }
    const redisClient = await getClient();
    const jsonString = JSON.stringify(value);
    await redisClient.setEx(key, ttlSeconds, jsonString);
}

export async function getJson<T>(key: string): Promise<T | null> {
    const redisClient = await getClient();
    const jsonString = await redisClient.get(key);
    if (!jsonString) {
        return null;
    }

    try {
        return JSON.parse(jsonString) as T;
    } catch {
        throw new Error(`Stored value for key "${key}" is not valid JSON`);
    }
}

export async function closeRedis(): Promise<void> {
    if (client) {
        if (client.isOpen) {
            await client.quit();
        } else {
            await client.disconnect();
        }
        client = null;
        connectPromise = null;
    }
}
