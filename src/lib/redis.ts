import { createClient } from "redis";
import { config } from "./config";

type RedisClientType = ReturnType<typeof createClient>;

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

async function getClient(): Promise<RedisClientType> {
    if (client) {
        return client;
    }

    if (connectPromise) {
        return connectPromise;
    }

    connectPromise = (async () => {
        const newClient = createClient({
            url: config.redisUrl,
        });

        newClient.on("error", (err) => {
            console.error("Redis client error:", err);
        });

        await newClient.connect();
        client = newClient;
        return newClient;
    })();

    return connectPromise;
}

export async function setJson<T>(
    key: string,
    value: T,
    ttlSeconds: number
): Promise<void> {
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
    return JSON.parse(jsonString) as T;
}

export async function closeRedis(): Promise<void> {
    if (client) {
        await client.quit();
        client = null;
        connectPromise = null;
    }
}
