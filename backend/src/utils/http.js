export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, 'Data tidak valid.', result.error.issues.map((issue) => ({
      field: issue.path.join('.'), message: issue.message,
    })));
  }
  return result.data;
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function pageOptions(query) {
  const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(query.limit || '50', 10) || 50));
  return { page, limit, skip: (page - 1) * limit };
}

export function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}
