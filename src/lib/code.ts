import { randomInt } from "node:crypto";

const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" as const;
const CODE_FORMAT_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;

function isValidCodeFormat(code: string): boolean {
  return CODE_FORMAT_REGEX.test(code);
}

export function generateCode(): string {
  let raw = "";
  for (let index = 0; index < 8; index += 1) {
    const randomIndex = randomInt(0, CODE_CHARSET.length);
    raw += CODE_CHARSET[randomIndex];
  }

  const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;

  if (!isValidCodeFormat(code)) {
    throw new Error("Generated session code has invalid format");
  }

  return code;
}
