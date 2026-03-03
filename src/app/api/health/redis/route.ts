import { NextResponse } from "next/server";
import { getJson, setJson } from "@/lib/redis";
export async function GET() {
    try {
        // simple sanity check: set a temp key and read it back
        const key = `healthcheck:${Date.now()}`;
        await setJson(key, { pong: true }, 5);
        const value = await getJson<{ pong: boolean }>(key);

        if (value?.pong) {
            return NextResponse.json({ ok: true });
        }

        // unexpected missing value
        return NextResponse.json({ ok: false }, { status: 500 });
    } catch (err) {
        console.error("Redis healthcheck failed:", err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
