/**
 * MacroForge — Review Submission
 * POST /api/community/review
 *
 * Accepts customer review submissions with full safety pipeline.
 * ALL reviews go to moderation queue — never live immediately.
 *
 * Security:
 *   - Rate limited by IP + anonymous_id
 *   - Content safety check (URL blocking, profanity)
 *   - Verified purchase verification
 *   - Deduplication via content hash
 *   - Input sanitization + length limits
 *   - NO file uploads accepted here (future: signed URL pattern)
 */

import { submitReview }       from '../../lib/backend/communityOps.js';
import { isValidAnonymousId, hashIp } from '../../lib/backend/security.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10240) return res.status(413).json({ error: 'Payload too large' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const { anonymous_id, shopify_order_id, product_slug, rating, title, body: reviewBody, goal } = body || {};

  if (!isValidAnonymousId(anonymous_id)) {
    return res.status(400).json({ error: 'Invalid anonymous_id' });
  }

  const ipHash = hashIp(req.headers['x-real-ip'] || req.headers['x-forwarded-for']);

  try {
    const result = await submitReview({
      anonymousId:    anonymous_id,
      shopifyOrderId: shopify_order_id ? parseInt(shopify_order_id, 10) : null,
      productSlug:    product_slug || null,
      rating:         parseInt(rating, 10),
      title,
      body:           reviewBody,
      goal:           goal || null,
      ipHash,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      ok:      true,
      status:  result.status,
      message: result.message,
    });
  } catch (err) {
    console.error('[MacroForge Review] Error:', err.message);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
}
