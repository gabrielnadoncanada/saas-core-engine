export function okResult<T extends object>(payload: T) {
  return { ok: true as const, ...payload };
}

export function failResult() {
  return { ok: false as const };
}
