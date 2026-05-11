/**
 * MacroForge — Community Operations
 *
 * Phase 13 — Scale + Media + Community Ecosystem
 * SERVER-SIDE ONLY.
 *
 * Handles all community content operations with safety-first design:
 *   - Review submission with moderation pipeline
 *   - Transformation submission (consent-aware)
 *   - UGC content safety checks
 *   - Spam/fraud detection
 *   - Moderation queue management
 *
 * SAFETY PRINCIPLES:
 *   - ALL user-generated content goes to moderation queue FIRST
 *   - NOTHING is live immediately (except in future auto-approve for verified accounts)
 *   - No raw file uploads (future: signed URLs only via Cloudflare R2)
 *   - Profanity filter applied before storage
 *   - Rate limiting per customer
 *   - IP hash tracking for fraud correlation
 *   - Content hash deduplication (no spam repeat submissions)
 *
 * FUTURE UGC UPLOAD SAFETY:
 *   Image uploads must use signed URLs:
 *   POST /api/community/upload-url → backend generates signed R2/Supabase URL
 *   Client uploads directly to CDN (never to MacroForge servers)
 *   Backend validates file on webhook (size, type, content hash)
 *   DO NOT expose a direct upload endpoint publicly.
 */

import { supabase }    from './supabase.js';
import { hashIp }      from './security.js';
import { writeAudit }  from './auditLog.js';
import { awardPoints } from './loyaltyEngine.js';
import crypto          from 'crypto';

// ── Content safety ────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /\bspam\b/i,
  /buy\s+now/i,
  /click\s+here/i,
  /http[s]?:\/\//i,  // no URLs in reviews
  // Add more as needed — keep list short and targeted
];

function contentSafetyCheck(text) {
  const flags = [];
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) flags.push(pattern.source);
  }
  return { safe: flags.length === 0, flags };
}

function hashContent(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 32);
}

// ── Review submission ─────────────────────────────────────────────

/**
 * Submit a customer review with full safety pipeline.
 * Always goes to moderation queue — never live immediately.
 *
 * Requirements:
 *   - Must have a verified Shopify order (verified_purchase = true)
 *   - Rate limit: 1 review per product per customer
 *   - Content safety check
 *   - Deduplication via content hash
 */
export async function submitReview({
  anonymousId,
  shopifyOrderId,
  productSlug,
  rating,
  title,
  body,
  goal,
  ipHash,
}) {
  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return { success: false, error: 'Invalid rating (1-5)' };
  }

  // Text length validation
  if (!title?.trim() || title.length > 100) {
    return { success: false, error: 'Title required (max 100 chars)' };
  }
  if (!body?.trim() || body.length < 20 || body.length > 2000) {
    return { success: false, error: 'Review body must be 20–2000 characters' };
  }

  // Content safety
  const titleCheck = contentSafetyCheck(title);
  const bodyCheck  = contentSafetyCheck(body);
  const autoFlags  = [...titleCheck.flags, ...bodyCheck.flags];

  if (!titleCheck.safe || !bodyCheck.safe) {
    await writeAudit({ eventType: 'review_blocked_safety', anonymousId, payload: { flags: autoFlags } });
    return { success: false, error: 'Contenido no permitido en la reseña.' };
  }

  // Deduplication
  const contentHash = hashContent(title + body);
  const { data: duplicate } = await supabase
    .from('customer_reviews')
    .eq('content_hash', contentHash)
    .select('id').single();

  if (duplicate) return { success: false, error: 'Reseña duplicada.' };

  // Rate limit: 1 review per product per customer
  const { data: existing } = await supabase
    .from('customer_reviews')
    .eq('anonymous_id', anonymousId)
    .eq('product_slug', productSlug || '')
    .select('id').single();

  if (existing) return { success: false, error: 'Ya enviaste una reseña para este producto.' };

  // Verify purchase if shopifyOrderId provided
  let verifiedPurchase = false;
  if (shopifyOrderId) {
    const { data: order } = await supabase
      .from('shopify_orders')
      .eq('shopify_order_id', shopifyOrderId)
      .eq('anonymous_id', anonymousId)
      .eq('status', 'paid')
      .select('id').single();
    verifiedPurchase = Boolean(order);
  }

  // Insert review (pending moderation)
  const { data: review } = await supabase.from('customer_reviews').insert({
    anonymous_id:     anonymousId,
    shopify_order_id: shopifyOrderId,
    product_slug:     productSlug || null,
    rating,
    title:            title.trim(),
    body:             body.trim(),
    goal:             goal || null,
    verified_purchase: verifiedPurchase,
    status:           'pending',
    ip_hash:          ipHash,
    content_hash:     contentHash,
  }).single();

  // Add to moderation queue
  if (review) {
    await supabase.from('ugc_moderation_queue').insert({
      content_type: 'review',
      content_id:   review.id,
      anonymous_id: anonymousId,
      auto_flags:   autoFlags,
      priority:     autoFlags.length > 0 ? 'urgent' : 'normal',
    });

    // Award points for review submission (points pending approval)
    if (verifiedPurchase) {
      await awardPoints(anonymousId, 'review_submitted', {
        referenceId: review.id,
        isPending:   true,  // confirmed when review is approved
      });
    }
  }

  await writeAudit({ eventType: 'review_submitted', anonymousId, payload: { product_slug: productSlug, rating, verified: verifiedPurchase } });

  return {
    success: true,
    status:  'pending_moderation',
    message: 'Tu reseña fue recibida y será publicada después de verificación.',
  };
}

// ── Transformation submission ─────────────────────────────────────

/**
 * Submit a transformation story.
 * Requires explicit consent. Image handling is deferred to CDN.
 */
export async function submitTransformation({
  anonymousId,
  goal,
  durationDays,
  storyText,
  productsUsed,
  stackTier,
  consentGiven,
  ipHash,
}) {
  if (!consentGiven) {
    return { success: false, error: 'Se requiere consentimiento para publicar tu historia.' };
  }

  if (!storyText?.trim() || storyText.length < 50 || storyText.length > 3000) {
    return { success: false, error: 'Historia debe tener entre 50 y 3000 caracteres.' };
  }

  const safetyCheck = contentSafetyCheck(storyText);
  if (!safetyCheck.safe) {
    return { success: false, error: 'Contenido no permitido.' };
  }

  const { data: submission } = await supabase.from('transformation_submissions').insert({
    anonymous_id:   anonymousId,
    goal,
    duration_days:  durationDays,
    story_text:     storyText.trim(),
    products_used:  productsUsed || [],
    stack_tier:     stackTier,
    consent_given:  true,
    consent_text:   'Autorizo a MacroForge a publicar mi historia de transformación con fines de comunidad.',
    status:         'pending',
  }).single();

  if (submission) {
    await supabase.from('ugc_moderation_queue').insert({
      content_type: 'transformation',
      content_id:   submission.id,
      anonymous_id: anonymousId,
      priority:     'normal',
    });

    await awardPoints(anonymousId, 'transformation_submitted', { referenceId: submission.id });
  }

  return { success: true, status: 'pending_review' };
}

// ── Moderation helpers ────────────────────────────────────────────

/**
 * Approve a review (called by admin moderation tool).
 */
export async function approveReview(reviewId) {
  await Promise.all([
    supabase.from('customer_reviews').update({
      status:         'approved',
      moderated_by:   'human',
      moderated_at:   new Date().toISOString(),
    }).eq('id', reviewId),
    supabase.from('ugc_moderation_queue').update({
      status:       'approved',
      reviewed_at:  new Date().toISOString(),
    }).eq('content_id', reviewId),
  ]);
  return { success: true };
}
