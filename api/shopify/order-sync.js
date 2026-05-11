/**
 * MacroForge — Shopify Order + Catalog Sync
 * GET/POST /api/shopify/order-sync
 *
 * Multi-purpose operational endpoint:
 *   GET  ?action=health         → Shopify API health + queue status
 *   POST ?action=sync_products  → Sync Shopify catalog to shopify_products table
 *   POST ?action=cleanup        → Mark abandoned/expired checkouts
 *   GET  ?action=report         → Operational metrics report
 *
 * Security:
 *   - Requires INTERNAL_ADMIN_SECRET in X-Admin-Token header
 *   - Not exposed to frontend
 *   - Rate limited by Vercel edge
 */

import crypto                         from 'crypto';
import { checkShopifyHealth }         from '../../lib/backend/shopify.js';
import { supabase }                   from '../../lib/backend/supabase.js';
import { writeAudit }                 from '../../lib/backend/auditLog.js';

function validateAdmin(req) {
  const token  = req.headers['x-admin-token'] || '';
  const secret = process.env.INTERNAL_ADMIN_SECRET;
  if (!secret || !token) return false;
  try { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret)); }
  catch { return false; }
}

export default async function handler(req, res) {
  if (!validateAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const action = req.query.action || 'health';

  switch (action) {

    case 'health': {
      const shopifyHealth = await checkShopifyHealth();
      const { data: pendingCheckouts } = await supabase
        .from('checkout_sessions').eq('status', 'created').select('id');
      const { data: recentOrders } = await supabase
        .from('shopify_orders').eq('status', 'paid').gte('paid_at', new Date(Date.now() - 86400_000).toISOString()).select('id, total_price');

      const revenue24h = (recentOrders || []).reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);

      return res.status(200).json({
        shopify:         shopifyHealth,
        pending_checkouts: pendingCheckouts?.length || 0,
        orders_24h:      recentOrders?.length || 0,
        revenue_24h_crc: Math.round(revenue24h),
      });
    }

    case 'cleanup': {
      // Mark expired checkout sessions as abandoned
      const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
      const { data: expired } = await supabase
        .from('checkout_sessions')
        .eq('status', 'created')
        .lt('created_at', cutoff)
        .update({ status: 'abandoned', abandoned_at: new Date().toISOString() });

      await writeAudit({ eventType: 'checkout_cleanup', payload: { expired_count: expired?.length || 0 } });
      return res.status(200).json({ cleaned: expired?.length || 0 });
    }

    case 'report': {
      const now       = new Date();
      const yesterday = new Date(now - 86400_000).toISOString();

      const [
        { data: checkouts },
        { data: orders },
        { data: mappedProducts },
        { data: lifecycle },
      ] = await Promise.all([
        supabase.from('checkout_sessions').gte('created_at', yesterday).select('status'),
        supabase.from('shopify_orders').gte('created_at', yesterday).select('status, total_price, stack_tier, goal'),
        supabase.from('shopify_products').eq('is_active', true).select('mf_slug'),
        supabase.from('post_purchase_lifecycle').eq('reorder_status', 'pending').select('id'),
      ]);

      const checkoutStats = (checkouts || []).reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      const revenue = (orders || []).filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);

      return res.status(200).json({
        period: '24h',
        checkouts:        checkoutStats,
        orders_paid:      (orders || []).filter(o => o.status === 'paid').length,
        revenue_crc:      Math.round(revenue),
        mapped_products:  mappedProducts?.length || 0,
        pending_lifecycle: lifecycle?.length || 0,
      });
    }

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}
