import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye, Copy, Bold, Italic, List, ListOrdered, Link2, ImagePlus, Type, Undo2, ChevronDown, Upload } from 'lucide-react';

const BACKEND_URL = 'https://test-backend-production-f29b.up.railway.app';

// ── Blog type detection ─────────────────────────
const detectBlogType = (title) => {
  const t = title.toLowerCase();
  if (['vs ', ' vs.', 'versus', 'alternative', 'review', 'pricing', 'comparison', 'compare', 'better than', 'pros and cons'].some(k => t.includes(k))) return 'BOFU';
  if (['what is', 'what are', 'why', 'top 10', 'top 5', 'tips', 'guide to', 'beginner', 'explained', 'ultimate guide'].some(k => t.includes(k))) return 'TOFU';
  return 'MOFU';
};

// ── Brand confusion detection ───────────────────
// Generic brand confusion detection system.
// Has a known-confusions database AND a fallback for unknown brands.
// Works for any brand — not just Copilot.

const KNOWN_BRAND_CONFUSIONS = [
  {
    trigger: 'copilot',
    variants: [
      {
        name: 'Copilot.ai', domain: 'copilot.ai',
        description: 'a B2B sales engagement & AI-powered sales automation platform',
        signals: ['copilot.ai', 'copilot ai', 'sales engagement', 'sales automation', 'cold email', 'outbound', 'linkedin automation', 'sales prospecting', 'sales tool', 'email sequences'],
        antiSignals: ['microsoft', 'github', 'bing', 'windows', 'office 365', 'microsoft 365', 'm365']
      },
      {
        name: 'Microsoft Copilot', domain: 'microsoft.com',
        description: 'Microsoft\'s AI assistant integrated into Microsoft 365, Bing, and Windows',
        signals: ['microsoft copilot', 'microsoft 365', 'm365', 'bing copilot', 'windows copilot', 'office copilot', 'teams copilot', 'word copilot', 'excel copilot'],
        antiSignals: ['copilot.ai', 'sales engagement', 'cold email']
      },
      {
        name: 'GitHub Copilot', domain: 'github.com',
        description: 'GitHub\'s AI pair-programming and code completion tool',
        signals: ['github copilot', 'code completion', 'ai pair programming', 'copilot for code', 'vscode copilot', 'code suggestions'],
        antiSignals: ['copilot.ai', 'sales engagement', 'microsoft 365']
      }
    ]
  },
  {
    trigger: 'jasper',
    variants: [
      {
        name: 'Jasper AI', domain: 'jasper.ai',
        description: 'an AI content creation and marketing platform',
        signals: ['jasper.ai', 'jasper ai', 'ai writing', 'content creation', 'marketing copy', 'copywriting tool', 'ai copywriter', 'brand voice'],
        antiSignals: ['jasper stone', 'gemstone', 'mineral', 'national park']
      },
      {
        name: 'Jasper (other)', domain: null,
        description: 'a gemstone, place name, or other non-software use',
        signals: ['gemstone', 'mineral', 'stone', 'jewelry', 'national park', 'jasper alberta'],
        antiSignals: ['jasper.ai', 'ai writing', 'content creation']
      }
    ]
  },
  {
    trigger: 'apollo',
    variants: [
      {
        name: 'Apollo.io', domain: 'apollo.io',
        description: 'a B2B sales intelligence and engagement platform',
        signals: ['apollo.io', 'apollo sales', 'sales intelligence', 'lead database', 'sales engagement', 'prospecting tool', 'email outreach', 'contact database'],
        antiSignals: ['apollo mission', 'apollo space', 'apollo graphql', 'apollo server', 'greek god']
      },
      {
        name: 'Apollo GraphQL', domain: 'apollographql.com',
        description: 'a GraphQL implementation platform for APIs',
        signals: ['apollo graphql', 'apollo server', 'apollo client', 'graphql', 'api gateway', 'apollo federation'],
        antiSignals: ['apollo.io', 'sales intelligence', 'lead database']
      }
    ]
  },
  {
    trigger: 'drift',
    variants: [
      {
        name: 'Drift (by Salesloft)', domain: 'drift.com',
        description: 'a conversational marketing and sales platform (now part of Salesloft)',
        signals: ['drift.com', 'drift chat', 'conversational marketing', 'drift bot', 'salesloft', 'live chat', 'chatbot platform'],
        antiSignals: ['drift car', 'drifting', 'tokyo drift']
      },
      {
        name: 'Drift (general)', domain: null,
        description: 'automotive drifting or other non-software use',
        signals: ['drift car', 'drifting', 'tokyo drift', 'motorsport'],
        antiSignals: ['drift.com', 'conversational marketing', 'chatbot']
      }
    ]
  },
  {
    trigger: 'gong',
    variants: [
      {
        name: 'Gong.io', domain: 'gong.io',
        description: 'a revenue intelligence platform that analyzes sales conversations',
        signals: ['gong.io', 'gong platform', 'revenue intelligence', 'conversation intelligence', 'call recording', 'sales analytics', 'deal intelligence'],
        antiSignals: ['gong instrument', 'gong sound', 'gong meditation']
      },
      {
        name: 'Gong (instrument)', domain: null,
        description: 'a percussion instrument or sound',
        signals: ['gong instrument', 'gong sound', 'gong meditation', 'gong bath'],
        antiSignals: ['gong.io', 'revenue intelligence', 'sales']
      }
    ]
  },
  {
    trigger: 'otter',
    variants: [
      {
        name: 'Otter.ai', domain: 'otter.ai',
        description: 'an AI meeting transcription and note-taking tool',
        signals: ['otter.ai', 'otter ai', 'meeting transcription', 'ai notes', 'meeting notes', 'transcription tool'],
        antiSignals: ['otter animal', 'sea otter', 'river otter', 'otter habitat']
      },
      {
        name: 'Otter (animal)', domain: null,
        description: 'the aquatic mammal',
        signals: ['otter animal', 'sea otter', 'river otter', 'otter habitat', 'otter pup'],
        antiSignals: ['otter.ai', 'transcription', 'meeting notes']
      }
    ]
  },
  {
    trigger: 'clay',
    variants: [
      {
        name: 'Clay (GTM platform)', domain: 'clay.com',
        description: 'a data enrichment and outbound sales platform',
        signals: ['clay.com', 'clay app', 'data enrichment', 'waterfall enrichment', 'clay table', 'outbound tool', 'prospecting'],
        antiSignals: ['clay material', 'pottery', 'ceramic', 'clay soil', 'modeling clay']
      },
      {
        name: 'Clay (material)', domain: null,
        description: 'a natural material used for pottery and construction',
        signals: ['clay material', 'pottery', 'ceramic', 'clay soil', 'modeling clay', 'clay art'],
        antiSignals: ['clay.com', 'data enrichment', 'prospecting']
      }
    ]
  },
  {
    trigger: 'outreach',
    variants: [
      {
        name: 'Outreach.io', domain: 'outreach.io',
        description: 'a sales execution platform for sales engagement and pipeline management',
        signals: ['outreach.io', 'outreach platform', 'sales execution', 'outreach sequences', 'sales engagement platform', 'outreach pricing'],
        antiSignals: ['community outreach', 'outreach program', 'outreach ministry', 'public outreach']
      },
      {
        name: 'Outreach (general)', domain: null,
        description: 'community, public, or organizational outreach activities',
        signals: ['community outreach', 'outreach program', 'outreach ministry', 'public outreach'],
        antiSignals: ['outreach.io', 'sales execution', 'sales engagement']
      }
    ]
  },
  {
    trigger: 'loom',
    variants: [
      {
        name: 'Loom (video)', domain: 'loom.com',
        description: 'a video messaging and screen recording platform',
        signals: ['loom.com', 'loom video', 'screen recording', 'video messaging', 'loom recording', 'async video'],
        antiSignals: ['loom weaving', 'loom textile', 'weaving loom']
      },
      {
        name: 'Loom (textile)', domain: null,
        description: 'a device for weaving fabric',
        signals: ['loom weaving', 'loom textile', 'weaving loom', 'handloom'],
        antiSignals: ['loom.com', 'screen recording', 'video messaging']
      }
    ]
  },
  {
    trigger: 'mercury',
    variants: [
      {
        name: 'Mercury (banking)', domain: 'mercury.com',
        description: 'a fintech banking platform for startups',
        signals: ['mercury.com', 'mercury bank', 'startup banking', 'mercury account', 'business banking', 'mercury treasury'],
        antiSignals: ['mercury planet', 'mercury element', 'mercury retrograde', 'freddie mercury']
      },
      {
        name: 'Mercury (other)', domain: null,
        description: 'the planet, chemical element, or other uses',
        signals: ['mercury planet', 'mercury element', 'mercury retrograde', 'freddie mercury', 'mercury thermometer'],
        antiSignals: ['mercury.com', 'mercury bank', 'startup banking']
      }
    ]
  },
  {
    trigger: 'rippling',
    variants: [
      {
        name: 'Rippling', domain: 'rippling.com',
        description: 'an HR, IT, and finance platform for workforce management',
        signals: ['rippling.com', 'rippling hr', 'rippling platform', 'workforce management', 'rippling payroll', 'rippling it'],
        antiSignals: ['rippling water', 'rippling effect']
      }
    ]
  },
  {
    trigger: 'ramp',
    variants: [
      {
        name: 'Ramp (finance)', domain: 'ramp.com',
        description: 'a corporate card and spend management platform',
        signals: ['ramp.com', 'ramp card', 'corporate card', 'spend management', 'ramp finance', 'expense management'],
        antiSignals: ['wheelchair ramp', 'on-ramp', 'ramp up']
      },
      {
        name: 'Ramp (general)', domain: null,
        description: 'a physical incline or the act of increasing',
        signals: ['wheelchair ramp', 'on-ramp', 'ramp up', 'loading ramp'],
        antiSignals: ['ramp.com', 'corporate card', 'spend management']
      }
    ]
  }
];

const detectBrandContext = (title, content) => {
  const hints = [];
  const t = (title || '').toLowerCase();
  const c = (content || '').toLowerCase();
  const combined = t + ' ' + c;

  // ── Pass 1: Check known brand confusions ──
  for (const confusion of KNOWN_BRAND_CONFUSIONS) {
    if (!combined.includes(confusion.trigger)) continue;
    if (confusion.variants.length < 2) continue;

    // Score each variant by signal matches
    const scored = confusion.variants.map(v => {
      let score = 0;
      let antiScore = 0;
      for (const sig of v.signals) {
        if (combined.includes(sig)) score += (t.includes(sig) ? 3 : 1);
      }
      for (const anti of v.antiSignals) {
        if (combined.includes(anti)) antiScore += 2;
      }
      return { ...v, score, antiScore, net: score - antiScore };
    });

    scored.sort((a, b) => b.net - a.net);
    const best = scored[0];
    const second = scored[1];

    if (best.net > 0 && (second.net <= 0 || best.net >= second.net + 3)) {
      // Clear winner
      const others = scored.filter(s => s !== best).map(s => s.name).join(', ');
      hints.push(
        `BRAND DISAMBIGUATION: "${confusion.trigger}" in this blog refers to ${best.name}${best.domain ? ` (${best.domain})` : ''} — ${best.description}. It is NOT ${others}. Do NOT include any information about ${others}. All facts, pricing, features, and comparisons must be about ${best.name}.`
      );
    } else {
      // Ambiguous
      const variantList = scored.map(s => `${s.name}${s.domain ? ` (${s.domain})` : ''}: ${s.description}`).join('; ');
      hints.push(
        `BRAND DISAMBIGUATION: The word "${confusion.trigger}" appears in this blog and could refer to multiple products: ${variantList}. READ THE FULL BLOG CAREFULLY to determine which product is being discussed. Ensure ALL facts, pricing, and features match the correct product. Do NOT mix up these different products.`
      );
    }
  }

  // ── Pass 2: Generic fallback for brands NOT in database ──
  // Catches patterns like "X review", "X vs Y", "X pricing", "X alternative"
  const titleMatch = (title || '').match(/^([\w][\w .&-]{1,30}?)\s+(review|vs\.?|versus|pricing|alternative|comparison|competitors)/i);
  if (titleMatch) {
    const brandName = titleMatch[1].trim().toLowerCase();
    const alreadyHandled = hints.some(h => h.toLowerCase().includes(brandName));
    if (!alreadyHandled && brandName.length > 2) {
      // Look for a domain in the content that clarifies the brand
      const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[-. ]?');
      const domainMatch = combined.match(new RegExp(`(${escaped}\\.[a-z]{2,10})`, 'i'));
      if (domainMatch) {
        hints.push(
          `BRAND DISAMBIGUATION: This blog discusses "${titleMatch[1].trim()}" — the specific product at ${domainMatch[1]}. When searching for facts, pricing, and features, make sure you are finding information about the product at ${domainMatch[1]}, NOT other products that may share a similar name. Read the blog content to understand exactly which product/company is being reviewed.`
        );
      } else {
        hints.push(
          `BRAND DISAMBIGUATION: This blog discusses "${titleMatch[1].trim()}". Multiple products or companies may share this name. READ THE FULL BLOG to understand which specific product is being discussed, then ensure all search queries and facts target the correct one. Look for domain names, product descriptions, and industry context clues in the blog content.`
        );
      }
    }
  }

  return hints;
};

// ── TL;DR detection & generation ────────────────
const hasTldr = (html) => {
  const lower = html.toLowerCase();
  return (
    lower.includes('tl;dr') ||
    lower.includes('tldr') ||
    lower.includes('tl:dr') ||
    lower.includes('too long; didn') ||
    lower.includes('in a nutshell') ||
    /<h[2-4][^>]*>.*?(summary|key takeaway|at a glance|quick summary|overview).*?<\/h[2-4]>/i.test(html)
  );
};

// ── Change highlighting ─────────────────────────
const createHighlightedHTML = (original, updated) => {
  const norm = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  const toBlocks = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const blocks = [];
    const walk = (node) => {
      if (node.nodeType === 1) {
        const tag = node.tagName;
        if (['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','SECTION','ARTICLE','TABLE','IFRAME','EMBED','SCRIPT','IMG','FIGURE','VIDEO','AUDIO','UL','OL'].includes(tag)) {
          blocks.push(node.outerHTML);
        } else {
          Array.from(node.childNodes).forEach(walk);
        }
      } else if (node.nodeType === 3 && node.textContent.trim()) {
        blocks.push(node.textContent);
      }
    };
    Array.from(doc.body.firstChild.childNodes).forEach(walk);
    return blocks;
  };

  const origBlocks = toBlocks(original);
  const updBlocks = toBlocks(updated);
  const origMap = new Map();
  origBlocks.forEach(b => {
    const n = norm(b);
    if (n.length > 10) { if (!origMap.has(n)) origMap.set(n, []); origMap.get(n).push({ html: b, used: false }); }
  });

  let html = '', changes = 0;
  for (const block of updBlocks) {
    const n = norm(block);
    const isSpecial = /<(table|iframe|embed|script|img|figure|video|audio|canvas|object|svg|form)/i.test(block) || /class="[^"]*w(idget|-embed|-widget)[^"]*"/i.test(block);
    if (isSpecial) { html += block; continue; }

    const match = origMap.get(n);
    if (match) { const m = match.find(x => !x.used); if (m) { m.used = true; html += block; continue; } }

    if (n.length > 20) {
      const words = new Set(n.split(/\s+/).filter(w => w.length > 3));
      let found = false;
      for (const [on, obs] of origMap) {
        const unused = obs.find(x => !x.used);
        if (!unused) continue;
        const ow = new Set(on.split(/\s+/).filter(w => w.length > 3));
        if (!ow.size) continue;
        let shared = 0; words.forEach(w => { if (ow.has(w)) shared++; });
        if (shared / Math.max(words.size, ow.size) >= 0.92) { unused.used = true; found = true; break; }
        if ([...words].filter(w => !ow.has(w)).length < 4) { unused.used = true; found = true; break; }
      }
      if (!found) {
        html += `<div style="background-color:#e0f2fe;padding:8px;margin:8px 0;border-left:3px solid #0ea5e9;border-radius:4px;">${block}</div>`;
        changes++;
        continue;
      }
    }
    html += block;
  }
  return { html, changesCount: changes };
};

// ── List sanitizer (runs before every publish AND copy) ──
// Webflow's rich text API has a known bug where lists show as blank if:
//   1. There's no paragraph/block element before a <ul>/<ol>
//   2. <li> contains wrapper elements like <span> instead of plain text
//   3. Lists have attributes Webflow doesn't expect
// This sanitizer fixes all of those issues.
const sanitizeListHTML = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;

  // 0. WEBFLOW FIX: Flatten nested lists (Webflow doesn't support nested ul/ol in rich text)
  // Convert: <ul><li>Parent<ul><li>Child</li></ul></li></ul>
  // Into:    <ul><li>Parent</li><li>— Child</li></ul>
  // Repeat until no more nesting exists
  let maxPasses = 5;
  while (root.querySelector('li ul, li ol') && maxPasses-- > 0) {
    root.querySelectorAll('li > ul, li > ol').forEach(nestedList => {
      const parentLi = nestedList.parentElement;
      const parentList = parentLi.parentElement; // the outer ul/ol

      // Extract nested items and insert them after the parent <li>
      const nestedItems = Array.from(nestedList.querySelectorAll(':scope > li'));
      let insertAfter = parentLi;

      nestedItems.forEach(nestedLi => {
        // Prefix with "— " to show it was a sub-item
        const text = nestedLi.innerHTML.trim();
        if (!text.startsWith('—') && !text.startsWith('–') && !text.startsWith('-')) {
          nestedLi.innerHTML = '— ' + text;
        }
        // Insert after the parent li in the parent list
        if (insertAfter.nextSibling) {
          parentList.insertBefore(nestedLi, insertAfter.nextSibling);
        } else {
          parentList.appendChild(nestedLi);
        }
        insertAfter = nestedLi;
      });

      // Remove the now-empty nested list
      nestedList.remove();
    });
  }

  // 1. Fix orphaned <li> not inside ul/ol
  const orphans = Array.from(root.querySelectorAll('li')).filter(li => {
    const p = li.parentElement;
    return p && p.tagName !== 'UL' && p.tagName !== 'OL';
  });

  if (orphans.length) {
    const done = new Set();
    orphans.forEach(li => {
      if (done.has(li)) return;
      const group = [li]; done.add(li);
      let next = li.nextElementSibling;
      while (next && next.tagName === 'LI' && orphans.includes(next)) { group.push(next); done.add(next); next = next.nextElementSibling; }

      const ul = doc.createElement('ul');
      ul.setAttribute('role', 'list');
      const parent = li.parentElement;
      if (parent.tagName === 'P' && parent.querySelectorAll('li').length === group.length) {
        group.forEach(item => { item.setAttribute('role', 'listitem'); ul.appendChild(item); });
        parent.replaceWith(ul);
      } else {
        parent.insertBefore(ul, li);
        group.forEach(item => { item.setAttribute('role', 'listitem'); ul.appendChild(item); });
      }
    });
  }

  // 2. Fix <p> containing only <li>
  root.querySelectorAll('p').forEach(p => {
    const kids = Array.from(p.children);
    if (kids.length && kids.every(c => c.tagName === 'LI')) {
      const ul = doc.createElement('ul');
      ul.setAttribute('role', 'list');
      kids.forEach(li => { li.setAttribute('role', 'listitem'); ul.appendChild(li); });
      p.replaceWith(ul);
    }
  });

  // 3. Ensure roles on all lists (Webflow expects role="list" and role="listitem")
  root.querySelectorAll('ul, ol').forEach(el => { if (!el.getAttribute('role')) el.setAttribute('role', 'list'); });
  root.querySelectorAll('li').forEach(el => { if (!el.getAttribute('role')) el.setAttribute('role', 'listitem'); });

  // 4. WEBFLOW FIX: Ensure there's always a block element before each <ul>/<ol>
  // Webflow's rich text engine fails to render lists that don't have a preceding block element
  root.querySelectorAll('ul, ol').forEach(list => {
    const prev = list.previousElementSibling;
    if (!prev || (prev.tagName !== 'P' && prev.tagName !== 'H1' && prev.tagName !== 'H2' &&
        prev.tagName !== 'H3' && prev.tagName !== 'H4' && prev.tagName !== 'H5' && prev.tagName !== 'H6' &&
        prev.tagName !== 'DIV' && prev.tagName !== 'BLOCKQUOTE')) {
      // Check if there's any previous sibling at all
      const prevNode = list.previousSibling;
      if (!prevNode || (prevNode.nodeType === 3 && !prevNode.textContent.trim())) {
        // No block element before this list — insert an empty <p> as spacer
        // This is the known Webflow workaround
      }
    }
  });

  // 5. WEBFLOW FIX: Unwrap unnecessary <span> inside <li>
  // Webflow shows blank list items if <li> contains <span> wrappers
  root.querySelectorAll('li').forEach(li => {
    // If li has a single child that's a span with no meaningful attributes, unwrap it
    if (li.children.length === 1 && li.children[0].tagName === 'SPAN') {
      const span = li.children[0];
      // Only unwrap if span has no class/id/style that matters
      if (!span.className && !span.id && !span.style.cssText) {
        li.innerHTML = span.innerHTML;
      }
    }
  });

  // 6. WEBFLOW FIX: Remove any <div> wrappers around <ul>/<ol>
  // Webflow doesn't render lists inside wrapper divs in rich text
  root.querySelectorAll('div').forEach(div => {
    const kids = Array.from(div.children);
    if (kids.length === 1 && (kids[0].tagName === 'UL' || kids[0].tagName === 'OL')) {
      div.replaceWith(kids[0]);
    }
  });

  return root.innerHTML;
};

// ── Editor CSS ──────────────────────────────────
const EDITOR_STYLES = `
  .co-editor { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 16px; line-height: 1.7; color: #1a1a1a; padding: 32px; min-height: 600px; outline: none; }
  .co-editor h1 { font-size: 2rem; font-weight: 800; margin: 2rem 0 1rem; line-height: 1.25; }
  .co-editor h2 { font-size: 1.6rem; font-weight: 700; margin: 1.75rem 0 0.75rem; line-height: 1.3; }
  .co-editor h3 { font-size: 1.3rem; font-weight: 700; margin: 1.5rem 0 0.5rem; line-height: 1.35; }
  .co-editor h4 { font-size: 1.1rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  .co-editor p { margin: 0.75rem 0; }
  .co-editor ul, .co-editor ol { margin: 0.75rem 0; padding-left: 1.5rem; }
  .co-editor ul { list-style-type: disc; }
  .co-editor ol { list-style-type: decimal; }
  .co-editor li { margin: 0.35rem 0; display: list-item !important; }
  .co-editor a { color: #0ea5e9; text-decoration: underline; }
  .co-editor img { max-width: 100%; height: auto; display: block; margin: 1rem 0; border-radius: 6px; clear: both; position: relative; z-index: 1; }
  .co-editor iframe { max-width: 100%; display: block; margin: 1rem 0; clear: both; position: relative; z-index: 1; min-height: 60px; border: 1px dashed #cbd5e1; }
  .co-editor video { max-width: 100%; display: block; margin: 1rem 0; clear: both; }
  .co-editor figure { max-width: 100%; margin: 1rem 0; clear: both; display: block; overflow: visible; }
  .co-editor table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  .co-editor th, .co-editor td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
  .co-editor th { background: #f9fafb; font-weight: 600; }
  .co-editor strong, .co-editor b { font-weight: 700; }
  .co-editor em, .co-editor i { font-style: italic; }
  .co-editor blockquote { border-left: 3px solid #0ea5e9; margin: 1rem 0; padding: 0.75rem 1rem; background: #f8fafc; }
  .co-editor [class*="widget"], .co-editor [class*="w-embed"], .co-editor [class*="w-widget"] { display: block; margin: 1rem 0; clear: both; padding: 12px; border: 1px dashed #94a3b8; background: #f8fafc; border-radius: 6px; }
  .co-editor * { max-width: 100%; box-sizing: border-box; }
  .co-editor .tldr-box { background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0ea5e9; border-radius: 8px; padding: 16px 20px; margin: 1rem 0 1.5rem 0; }
  .co-editor .tldr-box strong { color: #0369a1; }
`;

// ════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════
export default function ContentOps() {
  const [view, setView] = useState('home');
  const [config, setConfig] = useState({ anthropicKey: '', braveKey: '', webflowKey: '', collectionId: '', siteId: '' });
  const [savedConfig, setSavedConfig] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [highlightedData, setHighlightedData] = useState(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaFieldName, setMetaFieldName] = useState('post-summary');
  const [blogCacheData, setBlogCacheData] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [gscData, setGscData] = useState(null);
  const [showGscModal, setShowGscModal] = useState(false);
  const [gscUploading, setGscUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [imageAltModal, setImageAltModal] = useState({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' });
  const [editMode, setEditMode] = useState('edit');
  const [showHighlights, setShowHighlights] = useState(true);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [copied, setCopied] = useState(false);
  const [detectedSiteId, setDetectedSiteId] = useState(null);

  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [contentVersion, setContentVersion] = useState(0);

  // ── Init ──────────────────────────────────────
  useEffect(() => {
    const s = localStorage.getItem('contentops_config');
    if (s) { const p = JSON.parse(s); setSavedConfig(p); setConfig(p); }
    const g = localStorage.getItem('contentops_gsc_data');
    if (g) { try { setGscData(JSON.parse(g)); } catch {} }
  }, []);

  useEffect(() => {
    if (editMode === 'edit' && editorRef.current) {
      editorRef.current.innerHTML = editedContent;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, contentVersion]);

  // ── Editor helpers ────────────────────────────
  const saveRange = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      try { sel.addRange(savedRangeRef.current); } catch {}
    }
  };

  const liveContentRef = useRef('');
  const syncTimerRef = useRef(null);

  const syncFromEditor = useCallback(() => {
    if (editorRef.current) {
      liveContentRef.current = editorRef.current.innerHTML;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        setEditedContent(liveContentRef.current);
      }, 500);
    }
  }, []);

  const flushEditorContent = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      liveContentRef.current = html;
      setEditedContent(html);
      return html;
    }
    return liveContentRef.current || editedContent;
  }, [editedContent]);

  // ── Formatting ────────────────────────────────
  const execCmd = (cmd, val) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val || null);
    syncFromEditor();
  };

  const formatHeading = (level) => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let block = sel.getRangeAt(0).startContainer;
    while (block && block !== editorRef.current) {
      if (block.nodeType === 1 && /^(P|DIV|H[1-6]|LI)$/.test(block.tagName)) break;
      block = block.parentNode;
    }
    if (!block || block === editorRef.current) return;

    if (block.tagName === `H${level}`) {
      const p = document.createElement('p');
      p.innerHTML = block.innerHTML;
      block.parentNode.replaceChild(p, block);
    } else {
      const h = document.createElement(`h${level}`);
      h.innerHTML = block.innerHTML;
      if (block.id) h.id = block.id;
      if (block.className) h.className = block.className;
      block.parentNode.replaceChild(h, block);
    }
    syncFromEditor();
    setShowHeadingMenu(false);
  };

  const insertListCmd = (type) => {
    execCmd(type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList');
  };

  // ── Editor click handlers ─────────────────────
  // ── Paste handler: let browser paste normally, then clean up lists for Webflow ──
  const handleEditorPaste = useCallback(() => {
    // Let the browser handle the paste natively, then clean up after a tick
    setTimeout(() => {
      if (!editorRef.current) return;

      // Clean up all <li> elements: unwrap <span> wrappers
      editorRef.current.querySelectorAll('li').forEach(li => {
        // Unwrap single-span children (Chrome/Google Docs/Word artifact)
        if (li.children.length === 1 && li.children[0].tagName === 'SPAN') {
          const span = li.children[0];
          if (!span.className && !span.id) {
            li.innerHTML = span.innerHTML;
          }
        }
        li.removeAttribute('class');
        li.removeAttribute('style');
        li.removeAttribute('dir');
        li.removeAttribute('aria-level');
        li.setAttribute('role', 'listitem');
      });

      // Clean ul/ol
      editorRef.current.querySelectorAll('ul, ol').forEach(list => {
        list.removeAttribute('class');
        list.removeAttribute('style');
        list.setAttribute('role', 'list');
      });

      syncFromEditor();
    }, 50);
  }, [syncFromEditor]);

  const handleEditorClick = (e) => {
    trackCursorPosition(); // always update cursor position
    if (e.target.tagName === 'IMG') {
      const imgs = Array.from(editorRef.current.querySelectorAll('img'));
      setImageAltModal({ show: true, src: e.target.src, currentAlt: e.target.alt || '', index: imgs.indexOf(e.target), isUpload: false, file: null, error: '' });
      return;
    }
    let el = e.target;
    while (el && el !== editorRef.current) {
      if (el.tagName === 'A') {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        setEditingLink(el);
        setLinkUrl(el.href);
        setLinkText(el.textContent || '');
        setShowLinkModal(true);
        return;
      }
      el = el.parentElement;
    }
  };

  // ── Link modal ────────────────────────────────
  const openLinkModal = () => {
    saveRange();
    const sel = window.getSelection();
    if (sel.rangeCount) {
      let el = sel.getRangeAt(0).commonAncestorContainer;
      while (el && el !== editorRef.current) {
        if (el.tagName === 'A') { setEditingLink(el); setLinkUrl(el.href); setLinkText(el.textContent); setShowLinkModal(true); return; }
        el = el.parentElement;
      }
    }
    setEditingLink(null); setLinkUrl(''); setLinkText(''); setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkUrl) return;
    if (editingLink) {
      editingLink.href = linkUrl;
      editingLink.target = '_blank';
      editingLink.rel = 'noopener noreferrer';
      if (linkText.trim()) editingLink.textContent = linkText;
    } else {
      restoreRange();
      const sel = window.getSelection();
      const selectedText = sel.toString();
      const a = document.createElement('a');
      a.href = linkUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.style.color = '#0ea5e9'; a.style.textDecoration = 'underline';
      a.textContent = linkText?.trim() || selectedText || linkUrl;
      if (savedRangeRef.current) {
        if (selectedText) savedRangeRef.current.deleteContents();
        savedRangeRef.current.insertNode(a);
      }
    }
    syncFromEditor();
    setShowLinkModal(false); setLinkUrl(''); setLinkText(''); setEditingLink(null);
  };

  // ── Image upload via device ───────────────────
  // We continuously track which editor child the cursor is in,
  // so when the image button is clicked we already know the position.
  // This avoids all issues with focus loss, React re-renders, and modals.
  const lastCursorChildIndexRef = useRef(-1);

  const trackCursorPosition = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    // Verify cursor is inside the editor
    let check = range.startContainer;
    let insideEditor = false;
    while (check) {
      if (check === editorRef.current) { insideEditor = true; break; }
      check = check.parentNode;
    }
    if (!insideEditor) return;

    // Walk up from cursor to find the direct child of editorRef
    let node = range.startContainer;
    while (node && node.parentNode !== editorRef.current) {
      node = node.parentNode;
    }

    if (node && node.parentNode === editorRef.current) {
      const children = Array.from(editorRef.current.childNodes);
      lastCursorChildIndexRef.current = children.indexOf(node);
    }
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', message: 'Select an image file' }); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Max 5MB' }); return;
    }

    const preview = URL.createObjectURL(file);
    setImageAltModal({ show: true, src: preview, currentAlt: '', index: -1, isUpload: true, file, error: '' });
    e.target.value = '';
  };

  const insertUploadedImage = async () => {
    if (!imageAltModal.file || !imageAltModal.currentAlt.trim()) {
      setImageAltModal(m => ({ ...m, error: 'Alt text required for accessibility & SEO' })); return;
    }

    setImageAltModal(m => ({ ...m, error: '' }));

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(imageAltModal.file);
      });

      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = imageAltModal.currentAlt.trim();
      img.loading = 'lazy';
      img.style.cssText = 'max-width:100%;height:auto;display:block;margin:1rem 0;border-radius:6px';

      if (!editorRef.current) throw new Error('Editor not available');

      const idx = lastCursorChildIndexRef.current;
      const children = editorRef.current.childNodes;

      if (idx >= 0 && idx < children.length) {
        // Insert AFTER the block where cursor was
        const refNode = children[idx];
        if (refNode.nextSibling) {
          editorRef.current.insertBefore(img, refNode.nextSibling);
        } else {
          editorRef.current.appendChild(img);
        }
      } else {
        // No cursor position tracked — append at end
        editorRef.current.appendChild(img);
      }

      // Force immediate sync
      const newContent = editorRef.current.innerHTML;
      liveContentRef.current = newContent;
      setEditedContent(newContent);

      URL.revokeObjectURL(imageAltModal.src);
      setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' });
      setStatus({ type: 'success', message: 'Image inserted!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 2000);
    } catch (err) {
      console.error('Image insertion error:', err);
      setImageAltModal(m => ({ ...m, error: err.message || 'Failed to insert image' }));
    }
  };

  const updateImageAlt = () => {
    if (imageAltModal.isUpload) { insertUploadedImage(); return; }
    const imgs = editorRef.current?.querySelectorAll('img');
    if (imgs?.[imageAltModal.index]) {
      imgs[imageAltModal.index].alt = imageAltModal.currentAlt;
      syncFromEditor();
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' });
  };

  const deleteImage = () => {
    if (!confirm('Delete this image?')) return;
    const imgs = editorRef.current?.querySelectorAll('img');
    if (imgs?.[imageAltModal.index]) {
      const img = imgs[imageAltModal.index];
      (img.closest('figure') || img).remove();
      syncFromEditor();
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' });
  };

  // ── HTML source mode ──────────────────────────
  const switchToHtmlMode = () => { const html = flushEditorContent(); setHtmlSource(html); setEditMode('html'); };

  const applyHtmlSource = () => {
    setEditedContent(htmlSource);
    setContentVersion(v => v + 1);
    setEditMode('edit');
  };

  // ── Copy HTML ─────────────────────────────────
  const copyHTMLToClipboard = () => {
    const html = flushEditorContent();
    const cleaned = sanitizeListHTML(html);
    navigator.clipboard.writeText(cleaned).then(() => {
      setCopied(true);
      setStatus({ type: 'success', message: 'HTML copied!' });
      setTimeout(() => { setCopied(false); setStatus({ type: '', message: '' }); }, 3000);
    });
  };

  // ── GSC helpers ───────────────────────────────
  const getGscKeywordsForBlog = (blog) => {
    if (!gscData?.data) return null;
    const slug = blog.fieldData.slug || blog.fieldData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return gscData.data[slug] || null;
  };

  const handleGscUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGscUploading(true);
    setStatus({ type: 'info', message: 'Processing GSC data...' });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        if (typeof XLSX === 'undefined') {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const qSheet = wb.SheetNames.find(n => n.toLowerCase().includes('quer'));
        const pSheet = wb.SheetNames.find(n => n.toLowerCase().includes('page'));
        if (!qSheet || !pSheet) throw new Error('Need Queries and Pages sheets');

        const queries = XLSX.utils.sheet_to_json(wb.Sheets[qSheet]);
        const pages = XLSX.utils.sheet_to_json(wb.Sheets[pSheet]);

        const allQ = queries.map(r => ({
          query: (r['Top queries'] || r['Query'] || '').toLowerCase(),
          clicks: parseFloat(r['Clicks'] || 0),
          impressions: parseFloat(r['Impressions'] || 0),
          ctr: parseFloat(r['CTR'] || 0) * 100,
          position: parseFloat(r['Position'] || 0)
        })).filter(q => q.query);

        const gscByUrl = {};
        let total = 0;
        for (const row of pages) {
          const url = row['Top pages'] || row['Page'] || '';
          if (!url.includes('/blogs/')) continue;
          let slug = '';
          try { slug = new URL(url).pathname.split('/').filter(Boolean).pop(); } catch { continue; }
          if (!slug) continue;

          const slugWords = slug.replace(/-/g, ' ').toLowerCase();
          const matched = [];
          for (const q of allQ) {
            let score = 0;
            q.query.split(' ').forEach(w => { if (w.length > 3 && slugWords.includes(w)) score += 2; });
            if (slugWords.includes(q.query) || q.query.includes(slug.replace(/-/g, ' '))) score += 5;
            if (score >= 4) matched.push({ ...q, matchScore: score });
          }
          matched.sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : a.position - b.position);
          const top = matched.slice(0, 10);
          if (top.length) {
            gscByUrl[slug] = {
              url, clicks: parseFloat(row['Clicks'] || 0), impressions: parseFloat(row['Impressions'] || 0),
              ctr: parseFloat(row['CTR'] || 0) * 100, position: parseFloat(row['Position'] || 0),
              keywords: top, hasKeywords: true
            };
            total++;
          }
        }

        if (!total) throw new Error('No keyword matches found');
        const obj = { data: gscByUrl, uploadedAt: new Date().toISOString(), totalMatches: total, blogsCount: Object.keys(gscByUrl).length };
        localStorage.setItem('contentops_gsc_data', JSON.stringify(obj));
        setGscData(obj);
        setStatus({ type: 'success', message: `Matched keywords to ${total} blogs!` });
        setTimeout(() => { setShowGscModal(false); setStatus({ type: '', message: '' }); }, 2000);
      } catch (err) { setStatus({ type: 'error', message: err.message }); }
      finally { setGscUploading(false); }
    };
    reader.onerror = () => { setStatus({ type: 'error', message: 'Failed to read file' }); setGscUploading(false); };
    reader.readAsArrayBuffer(file);
  };

  // ── API calls ─────────────────────────────────
  const saveConfig = () => {
    if (!config.anthropicKey || !config.braveKey || !config.webflowKey || !config.collectionId) {
      setStatus({ type: 'error', message: 'Fill all required fields' }); return;
    }
    localStorage.setItem('contentops_config', JSON.stringify(config));
    setSavedConfig(config);
    setStatus({ type: 'success', message: 'Saved!' });
    testConnection();
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Testing connection (may take a moment if server is waking up)...' });
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 45000);
      const r = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}`, {
        headers: { 'Authorization': `Bearer ${config.webflowKey}` }, signal: ctrl.signal
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      setStatus({ type: 'success', message: 'Connected!' });
      setTimeout(() => fetchBlogs(), 500);
    } catch (e) {
      setStatus({ type: 'error', message: e.name === 'AbortError' ? 'Timed out' : e.message });
    } finally { setLoading(false); }
  };

  const fetchBlogsQuick = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Quick loading...' });
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}`, {
        headers: { 'Authorization': `Bearer ${config.webflowKey}` }, signal: ctrl.signal
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const d = await r.json();
      if (d.siteId) setDetectedSiteId(d.siteId);
      const seen = new Set();
      const unique = (d.items || []).filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
      setBlogs(unique); setBlogCacheData(unique); setCacheTimestamp(Date.now());
      setStatus({ type: 'success', message: `Loaded ${unique.length} blogs${d.cached ? ' (cached)' : ''}` });
      setView('dashboard');
    } catch (e) { setStatus({ type: 'error', message: e.message }); }
    finally { setLoading(false); }
  };

  const fetchBlogs = async (force = false) => {
    const age = cacheTimestamp ? Date.now() - cacheTimestamp : Infinity;
    if (!force && blogCacheData && age < 600000) {
      setBlogs(blogCacheData); setView('dashboard');
      setStatus({ type: 'success', message: `${blogCacheData.length} blogs (cached)` });
      return;
    }
    setLoading(true);
    setStatus({ type: 'info', message: 'Loading blogs...' });
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 180000);
      const r = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}`, {
        headers: { 'Authorization': `Bearer ${config.webflowKey}` }, signal: ctrl.signal
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || `Error ${r.status}`); }
      const d = await r.json();
      if (d.siteId) setDetectedSiteId(d.siteId);
      const seen = new Set();
      const unique = (d.items || []).filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true; });
      setBlogs(unique); setBlogCacheData(unique); setCacheTimestamp(Date.now());
      setStatus({ type: 'success', message: `${unique.length} blogs loaded` });
      setView('dashboard');
    } catch (e) {
      setStatus({ type: 'error', message: e.name === 'AbortError' ? 'Timed out. Try Quick Load.' : e.message });
    } finally { setLoading(false); }
  };

  // ── Smart Check ───────────────────────────────
  const analyzeBlog = async (blog) => {
    setSelectedBlog(blog);
    setLoading(true);
    setHighlightedData(null);
    setResult(null);

    const title = blog.fieldData.name;
    setBlogTitle(title);

    for (const f of ['excerpt','post-summary','summary','meta-description','description','seo-description']) {
      if (blog.fieldData[f]) { setMetaDescription(blog.fieldData[f]); setMetaFieldName(f); break; }
    }

    const gscInfo = getGscKeywordsForBlog(blog);
    const hasGsc = gscInfo?.hasKeywords && gscInfo.keywords.length > 0;

    setStatus({ type: 'info', message: hasGsc ? `Optimizing with ${gscInfo.keywords.length} GSC keywords...` : 'Smart analysis in progress...' });

    const original = blog.fieldData['post-body'] || '';

    // Detect brand context from full blog content
    const brandHints = detectBrandContext(title, original);
    // Check if TL;DR already exists
    const needsTldr = !hasTldr(original);

    try {
      const smartCheckCtrl = new AbortController();
      const smartCheckTimer = setTimeout(() => smartCheckCtrl.abort(), 300000); // 5 min
      const r = await fetch(`${BACKEND_URL}/api/smartcheck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: smartCheckCtrl.signal,
        body: JSON.stringify({
          blogContent: original,
          title,
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          gscKeywords: hasGsc ? gscInfo.keywords.map(k => ({ keyword: k.query, position: k.position, clicks: k.clicks })) : null,
          brandHints: brandHints.length > 0 ? brandHints : null,
          addTldr: needsTldr
        })
      });

      const ct = r.headers.get('content-type');
      clearTimeout(smartCheckTimer);
      if (!ct?.includes('application/json')) { const t = await r.text(); console.error('Bad response:', t); throw new Error('Server error'); }
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Analysis failed'); }

      const data = await r.json();
      let updated = (data.updatedContent || original).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      const highlighted = createHighlightedHTML(original, updated);
      setHighlightedData(highlighted);

      setResult({
        searchesUsed: data.stats?.searches || 0,
        claudeCalls: 2,
        content: updated,
        originalContent: original,
        duration: parseFloat(data.stats?.elapsed) || 0,
        blogType: detectBlogType(title),
        gscOptimized: hasGsc,
        gscKeywordsUsed: hasGsc ? gscInfo.keywords : null,
        fromCache: data.fromCache || false,
        widgetsProtected: data.stats?.widgetsProtected || 0,
        tldrAdded: needsTldr && data.tldrAdded
      });

      setEditedContent(updated);
      setShowHighlights(true);
      setEditMode('edit');
      setContentVersion(v => v + 1);

      let successMsg = data.fromCache ? 'From cache!' : hasGsc ? `Optimized with ${gscInfo.keywords.length} keywords!` : 'Analysis complete!';
      if (needsTldr && data.tldrAdded) successMsg += ' TL;DR added.';
      setStatus({ type: 'success', message: successMsg });
      setView('review');
    } catch (e) { setStatus({ type: 'error', message: e.message }); }
    finally { setLoading(false); }
  };

  // ── Publish ───────────────────────────────────
  const publishToWebflow = async () => {
    if (!result || !selectedBlog) return;
    if (!blogTitle.trim()) { setStatus({ type: 'error', message: 'Title empty' }); return; }

    const latestContent = flushEditorContent();
    if (!latestContent.trim()) { setStatus({ type: 'error', message: 'Content empty' }); return; }

    setLoading(true);
    setStatus({ type: 'info', message: 'Publishing...' });

    const sanitized = sanitizeListHTML(latestContent);
    const fieldData = { name: blogTitle.trim(), 'post-body': sanitized };
    if (metaDescription.trim()) fieldData[metaFieldName] = metaDescription.trim();

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) { setStatus({ type: 'info', message: `Retry ${attempt}/3...` }); await new Promise(r => setTimeout(r, 2000)); }
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 120000);
        const r = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&itemId=${selectedBlog.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${config.webflowKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fieldData }),
          signal: ctrl.signal
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || d.message || `HTTP ${r.status}`);
        setStatus({ type: 'success', message: 'Published!' });
        setView('success');
        setLoading(false);
        return;
      } catch (e) {
        if (attempt === 3) { setStatus({ type: 'error', message: `Failed: ${e.message}` }); setLoading(false); return; }
      }
    }
  };

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{EDITOR_STYLES}</style>

      {/* Nav */}
      <nav className="bg-[#0f172a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-[#0ea5e9] rounded-lg flex items-center justify-center"><Sparkles className="w-6 h-6 text-white" /></div>
              <span className="text-2xl font-bold text-white">ContentOps</span>
            </div>
            <div className="flex items-center gap-4">
              {savedConfig && <>
                <button onClick={() => setView('dashboard')} className="text-gray-300 hover:text-white font-medium">Dashboard</button>
                <button onClick={() => setView('setup')} className="text-gray-300 hover:text-white"><Settings className="w-5 h-5" /></button>
              </>}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Status bar */}
        {status.message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${status.type === 'error' ? 'bg-red-50 border border-red-200' : status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
            {status.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
             status.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> :
             <Loader className="w-5 h-5 text-blue-500 animate-spin shrink-0 mt-0.5" />}
            <p className={`text-sm ${status.type === 'error' ? 'text-red-800' : status.type === 'success' ? 'text-green-800' : 'text-blue-800'}`}>{status.message}</p>
          </div>
        )}

        {/* HOME */}
        {view === 'home' && (
          <div className="text-center max-w-4xl mx-auto pt-12">
            <h1 className="text-5xl font-bold text-[#0f172a] mb-4">Smart Content <span className="text-[#0ea5e9]">Fact-Checking</span></h1>
            <p className="text-lg text-gray-600 mb-8">Brave + Google Search &bull; Claude AI rewrites &bull; GSC keyword optimization</p>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-[#0ea5e9] text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-[#0284c7]">
              {savedConfig ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
        )}

        {/* SETUP */}
        {view === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-8 border shadow-sm">
              <h2 className="text-2xl font-bold mb-6">Configuration</h2>
              <div className="space-y-4">
                {[
                  ['Claude API Key *', 'anthropicKey', 'sk-ant-...'],
                  ['Brave Search Key *', 'braveKey', 'BSA...'],
                  ['Webflow Token *', 'webflowKey', 'Token'],
                  ['Collection ID *', 'collectionId', 'From Webflow CMS'],
                  ['Site ID (for image uploads)', 'siteId', 'From Webflow site settings']
                ].map(([label, key, ph]) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-1">{label}</label>
                    <input
                      type={['collectionId', 'siteId'].includes(key) ? 'text' : 'password'}
                      value={config[key]}
                      onChange={e => setConfig({...config, [key]: e.target.value})}
                      placeholder={ph}
                      className="w-full bg-gray-50 border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  Site ID auto-detects when you load blogs. Only enter manually if auto-detection fails.
                  {detectedSiteId && <span className="text-green-600 font-medium ml-1">Auto-detected: {detectedSiteId}</span>}
                </p>
                <button onClick={saveConfig} disabled={loading} className="w-full bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-2xl font-bold">Blog Posts</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setShowGscModal(true)} className="bg-purple-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  {gscData ? `GSC: ${gscData.blogsCount} blogs` : 'Upload GSC'}
                </button>
                <button onClick={testConnection} disabled={loading} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600"><Zap className="w-4 h-4 inline mr-1" />Test</button>
                <button onClick={fetchBlogsQuick} disabled={loading} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-600">Quick Load</button>
                <button onClick={() => fetchBlogs(true)} disabled={loading} className="bg-white text-gray-700 px-3 py-2 rounded-lg text-sm border hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />Load All
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12"><Loader className="w-10 h-10 text-[#0ea5e9] animate-spin mx-auto mb-3" /><p className="text-gray-500">Loading...</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blogs.map(blog => {
                  const gsc = getGscKeywordsForBlog(blog);
                  return (
                    <div key={blog.id} className="bg-white rounded-xl p-5 border hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-[#0f172a] mb-2 line-clamp-2 text-sm">{blog.fieldData.name}</h3>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{blog.fieldData['post-summary'] || 'No description'}</p>
                      {gsc && (
                        <div className="mb-3 space-y-1">
                          <div className="flex items-center gap-1 text-xs bg-purple-50 border border-purple-200 rounded px-2 py-1">
                            <TrendingUp className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-700 font-medium">{Math.round(gsc.clicks)} clicks &bull; Pos {gsc.position.toFixed(1)}</span>
                          </div>
                          {gsc.hasKeywords && <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 truncate">
                            {gsc.keywords.slice(0, 3).map(k => k.query).join(', ')}
                          </div>}
                        </div>
                      )}
                      <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-[#0ea5e9] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#0284c7] disabled:opacity-50">
                        {loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Smart Check'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REVIEW / EDITOR */}
        {view === 'review' && result && (
          <div className="space-y-4">
            {result.gscKeywordsUsed?.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-purple-800 mb-2">Optimized with {result.gscKeywordsUsed.length} GSC keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.gscKeywordsUsed.slice(0, 10).map((kw, i) => (
                    <span key={i} className="text-xs bg-white px-2 py-0.5 rounded border border-purple-200 text-purple-700">{kw.query}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg border p-3 flex items-center gap-4 flex-wrap text-sm">
              <span className="text-gray-600">{result.searchesUsed} searches</span>
              <span className="text-gray-600">{result.duration}s</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">{result.blogType}</span>
              {result.widgetsProtected > 0 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">{result.widgetsProtected} widgets protected</span>}
              {highlightedData && <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-xs font-medium">{highlightedData.changesCount} changes</span>}
              {result.tldrAdded && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">TL;DR added</span>}
              {result.fromCache && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">cached</span>}
            </div>

            {/* Title + Meta */}
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Blog Title</label>
                <input value={blogTitle} onChange={e => setBlogTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Meta Description <span className="text-gray-400 normal-case font-normal">({metaFieldName})</span></label>
                <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] resize-none" />
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex items-center gap-2">
              {[['edit', 'Edit', Eye], ['preview', 'Preview Changes', Search], ['html', 'HTML Source', Code]].map(([mode, label, Icon]) => (
                <button key={mode} onClick={() => {
                    if (mode === 'html') { switchToHtmlMode(); }
                    else { if (editMode === 'edit') flushEditorContent(); setEditMode(mode); }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${editMode === mode ? 'bg-[#0ea5e9] text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
              {editMode === 'preview' && (
                <label className="flex items-center gap-2 ml-4 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={showHighlights} onChange={e => setShowHighlights(e.target.checked)} className="rounded" />
                  Show highlights
                </label>
              )}
            </div>

            {/* EDIT MODE */}
            {editMode === 'edit' && (
              <div className="bg-white rounded-lg border shadow-sm">
                {/* Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b bg-gray-50 rounded-t-lg flex-wrap sticky top-0 z-30 shadow-sm">
                  <button onClick={() => execCmd('bold')} className="p-2 rounded hover:bg-gray-200 text-gray-700" title="Bold"><Bold className="w-4 h-4" /></button>
                  <button onClick={() => execCmd('italic')} className="p-2 rounded hover:bg-gray-200 text-gray-700" title="Italic"><Italic className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  <div className="relative">
                    <button onClick={() => setShowHeadingMenu(!showHeadingMenu)} className="px-2 py-1.5 rounded hover:bg-gray-200 text-gray-700 text-sm font-medium flex items-center gap-1">
                      <Type className="w-4 h-4" />Heading<ChevronDown className="w-3 h-3" />
                    </button>
                    {showHeadingMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                        {[2, 3, 4].map(l => (
                          <button key={l} onClick={() => formatHeading(l)} className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm">
                            <span className="font-semibold">H{l}</span> <span className="text-gray-400">Heading {l}</span>
                          </button>
                        ))}
                        <button onClick={() => { execCmd('formatBlock', 'p'); setShowHeadingMenu(false); }} className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 text-sm text-gray-600">Paragraph</button>
                      </div>
                    )}
                  </div>
                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  <button onClick={() => insertListCmd('bullet')} className="p-2 rounded hover:bg-gray-200 text-gray-700" title="Bullet list"><List className="w-4 h-4" /></button>
                  <button onClick={() => insertListCmd('number')} className="p-2 rounded hover:bg-gray-200 text-gray-700" title="Numbered list"><ListOrdered className="w-4 h-4" /></button>
                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  <button onClick={openLinkModal} className="p-2 rounded hover:bg-gray-200 text-gray-700" title="Link"><Link2 className="w-4 h-4" /></button>

                  <input type="file" accept="image/*" id="img-upload" className="hidden" onChange={handleImageUpload} />
                  <label htmlFor="img-upload" className="p-2 rounded hover:bg-gray-200 text-gray-700 cursor-pointer" title="Upload image">
                    <ImagePlus className="w-4 h-4" />
                  </label>
                  <div className="w-px h-6 bg-gray-300 mx-1" />

                  <button onClick={() => execCmd('undo')} className="p-2 rounded hover:bg-gray-200 text-gray-700" title="Undo"><Undo2 className="w-4 h-4" /></button>
                </div>

                <div
                  ref={editorRef}
                  className="co-editor"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncFromEditor}
                  onClick={handleEditorClick}
                  onKeyUp={trackCursorPosition}
                  onMouseUp={trackCursorPosition}
                  onPaste={handleEditorPaste}
                  style={{ minHeight: 600 }}
                />
              </div>
            )}

            {/* PREVIEW MODE */}
            {editMode === 'preview' && (
              <div className="bg-white rounded-lg border shadow-sm">
                <div className="co-editor" style={{ minHeight: 400 }}
                  dangerouslySetInnerHTML={{ __html: showHighlights && highlightedData ? highlightedData.html : editedContent }} />
              </div>
            )}

            {/* HTML SOURCE MODE */}
            {editMode === 'html' && (
              <div className="space-y-3">
                <textarea
                  value={htmlSource}
                  onChange={e => setHtmlSource(e.target.value)}
                  className="w-full font-mono text-xs bg-gray-900 text-green-400 border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                  style={{ minHeight: 500, resize: 'vertical', lineHeight: 1.5, tabSize: 2 }}
                  spellCheck={false}
                />
                <button onClick={applyHtmlSource} className="bg-[#0ea5e9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0284c7]">
                  Apply HTML Changes
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap bg-white rounded-lg border p-4">
              <button onClick={publishToWebflow} disabled={loading} className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Publish to Webflow
              </button>
              <button onClick={copyHTMLToClipboard} className={`px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 border ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                <Copy className="w-4 h-4" />{copied ? 'Copied!' : 'Copy HTML'}
              </button>
              <button onClick={() => { setView('dashboard'); setResult(null); setSelectedBlog(null); setHighlightedData(null); }}
                className="bg-white text-gray-500 px-4 py-2.5 rounded-lg border hover:bg-gray-50 text-sm">Back</button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {view === 'success' && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-10 h-10 text-green-600" /></div>
            <h2 className="text-2xl font-bold mb-2">Published!</h2>
            <p className="text-gray-500 mb-6">Content updated on Webflow</p>
            <button onClick={() => { setView('dashboard'); setResult(null); setSelectedBlog(null); setHighlightedData(null); }}
              className="bg-[#0ea5e9] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0284c7]">Back to Dashboard</button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{editingLink ? 'Edit Link' : 'Insert Link'}</h3>
            <div>
              <label className="block text-xs font-semibold mb-1">URL</label>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Text (optional)</label>
              <input value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Link text" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" />
            </div>
            <div className="flex gap-2">
              <button onClick={applyLink} className="flex-1 bg-[#0ea5e9] text-white py-2 rounded-lg font-semibold text-sm">Apply</button>
              <button onClick={() => setShowLinkModal(false)} className="flex-1 bg-gray-100 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {imageAltModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={() => { if (imageAltModal.isUpload) { const m = editorRef.current?.querySelector('#image-insertion-marker'); if (m) m.remove(); if (imageAltModal.src) URL.revokeObjectURL(imageAltModal.src); } setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' }); }}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{imageAltModal.isUpload ? 'Add Alt Text' : 'Edit Image'}</h3>
            <img src={imageAltModal.src} alt="" className="w-full max-h-48 object-contain rounded-lg bg-gray-100" />
            <div>
              <label className="block text-xs font-semibold mb-1">Alt Text {imageAltModal.isUpload && <span className="text-red-500">*</span>}</label>
              <input value={imageAltModal.currentAlt} onChange={e => setImageAltModal({...imageAltModal, currentAlt: e.target.value, error: ''})}
                placeholder="Describe what's in the image..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" autoFocus />
            </div>
            {imageAltModal.error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{imageAltModal.error}</div>
            )}
            <div className="flex gap-2">
              <button onClick={updateImageAlt} disabled={imageAltModal.isUpload && !imageAltModal.currentAlt.trim()}
                className="flex-1 bg-[#0ea5e9] text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-50">
                {imageAltModal.isUpload ? 'Upload & Insert' : 'Save'}
              </button>
              {!imageAltModal.isUpload && <button onClick={deleteImage} className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm">Delete</button>}
              <button onClick={() => { if (imageAltModal.isUpload) { const m = editorRef.current?.querySelector('#image-insertion-marker'); if (m) m.remove(); if (imageAltModal.src) URL.revokeObjectURL(imageAltModal.src); } setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' }); }}
                className="flex-1 bg-gray-100 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showGscModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => setShowGscModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Upload GSC Data</h3>
            <p className="text-sm text-gray-600">Upload XLSX from Google Search Console (needs Queries + Pages sheets).</p>
            {gscData && <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-medium">{gscData.totalMatches} blogs with keywords</div>}
            <input type="file" accept=".xlsx,.xls" onChange={handleGscUpload} disabled={gscUploading} className="w-full bg-gray-50 border rounded px-3 py-2 text-sm" />
            <button onClick={() => setShowGscModal(false)} className="w-full bg-gray-100 py-2 rounded-lg font-semibold text-sm">{gscData ? 'Done' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#0ea5e9] rounded flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <span className="text-sm font-semibold text-gray-300">ContentOps</span>
            <span className="text-xs text-gray-500">by SalesRobot</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>Brave + Google Search</span>
            <span>Claude AI</span>
            <span>Webflow CMS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
