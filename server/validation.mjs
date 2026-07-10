export function sanitizeKeywords(input, maxKeywords = 50) {
  if (!Array.isArray(input)) throw new Error('Keywords must be an array.');
  const seen = new Set();
  const result = [];

  for (const value of input) {
    if (typeof value !== 'string') continue;
    const keyword = value.trim().replace(/\s+/g, ' ');
    if (!keyword || keyword.length > 80) continue;
    const key = keyword.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
    if (result.length >= maxKeywords) break;
  }
  return result;
}

export function parseGeneratedKeywords(output, maxKeywords = 30) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    const match = output.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The AI response did not contain valid JSON.');
    parsed = JSON.parse(match[0]);
  }
  return sanitizeKeywords(parsed.keywords, maxKeywords);
}

export function sanitizeApprovedIds(input, candidates) {
  if (!Array.isArray(input)) throw new Error('Approved IDs must be an array.');
  const allowed = new Set(
    candidates.filter((candidate) => candidate.pinState === 'unpinned').map((candidate) => candidate.id)
  );
  return [...new Set(input.filter((id) => typeof id === 'string' && allowed.has(id)))];
}

