import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye, Copy, Bold, Italic, List, ListOrdered, Link2, ImagePlus, Type, Undo2, ChevronDown, Upload } from 'lucide-react';

const BACKEND_URL = 'https://contentops-backend-production.up.railway.app';

// ── Normalize browser-absolutized anchor hrefs ──
// The browser resolves #anchor hrefs to absolute URLs inside contenteditable.
// This converts them back to just "#hash" for display and storage.
// External https:// links pointing to other origins are left untouched.
const normalizeHref = (href) => {
  if (!href) return href;
  try {
    const url = new URL(href);
    if (
      url.origin === window.location.origin &&
      url.hash &&
      (url.pathname === window.location.pathname || url.pathname === '/')
    ) {
      return url.hash;
    }
  } catch {
    // Already relative (e.g. "#section") — leave as-is
  }
  return href;
};

// ── Blog type detection ─────────────────────────
const detectBlogType = (title) => {
  const t = title.toLowerCase();
  if (['vs ', ' vs.', 'versus', 'alternative', 'review', 'pricing', 'comparison', 'compare', 'better than', 'pros and cons'].some(k => t.includes(k))) return 'BOFU';
  if (['what is', 'what are', 'why', 'top 10', 'top 5', 'tips', 'guide to', 'beginner', 'explained', 'ultimate guide'].some(k => t.includes(k))) return 'TOFU';
  return 'MOFU';
};

// ── Brand confusion detection ───────────────────
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

  for (const confusion of KNOWN_BRAND_CONFUSIONS) {
    if (!combined.includes(confusion.trigger)) continue;
    if (confusion.variants.length < 2) continue;

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
      const others = scored.filter(s => s !== best).map(s => s.name).join(', ');
      hints.push(
        `BRAND DISAMBIGUATION: "${confusion.trigger}" in this blog refers to ${best.name}${best.domain ? ` (${best.domain})` : ''} — ${best.description}. It is NOT ${others}. Do NOT include any information about ${others}. All facts, pricing, features, and comparisons must be about ${best.name}.`
      );
    } else {
      const variantList = scored.map(s => `${s.name}${s.domain ? ` (${s.domain})` : ''}: ${s.description}`).join('; ');
      hints.push(
        `BRAND DISAMBIGUATION: The word "${confusion.trigger}" appears in this blog and could refer to multiple products: ${variantList}. READ THE FULL BLOG CAREFULLY to determine which product is being discussed. Ensure ALL facts, pricing, and features match the correct product. Do NOT mix up these different products.`
      );
    }
  }

  const titleMatch = (title || '').match(/^([\w][\w .&-]{1,30}?)\s+(review|vs\.?|versus|pricing|alternative|comparison|competitors)/i);
  if (titleMatch) {
    const brandName = titleMatch[1].trim().toLowerCase();
    const alreadyHandled = hints.some(h => h.toLowerCase().includes(brandName));
    if (!alreadyHandled && brandName.length > 2) {
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

// ── TL;DR detection ─────────────────────────────
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

// ── List sanitizer ──────────────────────────────
const sanitizeListHTML = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild;

  let maxPasses = 5;
  while (root.querySelector('li ul, li ol') && maxPasses-- > 0) {
    root.querySelectorAll('li > ul, li > ol').forEach(nestedList => {
      const parentLi = nestedList.parentElement;
      const parentList = parentLi.parentElement;

      const nestedItems = Array.from(nestedList.querySelectorAll(':scope > li'));
      let insertAfter = parentLi;

      nestedItems.forEach(nestedLi => {
        const text = nestedLi.innerHTML.trim();
        if (!text.startsWith('—') && !text.startsWith('–') && !text.startsWith('-')) {
          nestedLi.innerHTML = '— ' + text;
        }
        if (insertAfter.nextSibling) {
          parentList.insertBefore(nestedLi, insertAfter.nextSibling);
        } else {
          parentList.appendChild(nestedLi);
        }
        insertAfter = nestedLi;
      });

      nestedList.remove();
    });
  }

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

  root.querySelectorAll('p').forEach(p => {
    const kids = Array.from(p.children);
    if (kids.length && kids.every(c => c.tagName === 'LI')) {
      const ul = doc.createElement('ul');
      ul.setAttribute('role', 'list');
      kids.forEach(li => { li.setAttribute('role', 'listitem'); ul.appendChild(li); });
      p.replaceWith(ul);
    }
  });

  root.querySelectorAll('ul, ol').forEach(el => { if (!el.getAttribute('role')) el.setAttribute('role', 'list'); });
  root.querySelectorAll('li').forEach(el => { if (!el.getAttribute('role')) el.setAttribute('role', 'listitem'); });

  root.querySelectorAll('ul, ol').forEach(list => {
    const prev = list.previousElementSibling;
    if (!prev || (prev.tagName !== 'P' && prev.tagName !== 'H1' && prev.tagName !== 'H2' &&
        prev.tagName !== 'H3' && prev.tagName !== 'H4' && prev.tagName !== 'H5' && prev.tagName !== 'H6' &&
        prev.tagName !== 'DIV' && prev.tagName !== 'BLOCKQUOTE')) {
      const prevNode = list.previousSibling;
      if (!prevNode || (prevNode.nodeType === 3 && !prevNode.textContent.trim())) {
      }
    }
  });

  root.querySelectorAll('li').forEach(li => {
    if (li.children.length === 1 && li.children[0].tagName === 'SPAN') {
      const span = li.children[0];
      if (!span.className && !span.id && !span.style.cssText) {
        li.innerHTML = span.innerHTML;
      }
    }
  });

  root.querySelectorAll('div').forEach(div => {
    const kids = Array.from(div.children);
    if (kids.length === 1 && (kids[0].tagName === 'UL' || kids[0].tagName === 'OL')) {
      div.replaceWith(kids[0]);
    }
  });

  root.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    try {
      const url = new URL(href);
      if (
        url.origin === window.location.origin &&
        url.hash &&
        (url.pathname === window.location.pathname || url.pathname === '/')
      ) {
        a.setAttribute('href', url.hash);
      }
    } catch {
    }
  });

  return root.innerHTML;
};

// ── Block editor helpers ──────────────────────
// Widget = anything the browser must never edit. Rendered as a locked shell;
// its ORIGINAL html string is stored and returned verbatim on save.
const WIDGET_TAGS = ['TABLE', 'IFRAME', 'VIDEO', 'EMBED', 'OBJECT', 'SCRIPT', 'STYLE', 'FORM'];
function isWidgetElement(el) {
  if (!el || el.nodeType !== 1) return false;
  if (WIDGET_TAGS.includes(el.tagName)) return true;
  if (el.querySelector && el.querySelector('iframe,video,embed,object,script,table,form')) return true;
  if (el.tagName === 'DIV' && !el.classList.contains('tldr-box')) return true;
  if (el.tagName === 'FIGURE') return true; // images incl. — Webflow figure structure must stay byte-exact
  const cls = typeof el.className === 'string' ? el.className : '';
  if (/widget|w-embed|w-widget/i.test(cls)) return true;
  return false;
}

function widgetLabel(el) {
  if (el.tagName === 'TABLE' || el.querySelector?.('table')) return 'table';
  if (el.tagName === 'IFRAME' || el.querySelector?.('iframe')) return 'video / embed';
  if (el.tagName === 'VIDEO' || el.querySelector?.('video')) return 'video';
  if (el.querySelector?.('img')) return 'image';
  return 'embed';
}

// Balance <strong>/<em>/<b>/<i>/<u> within one block so an unclosed tag can
// never bleed past its own paragraph (the "everything turns bold" bug).
function balanceInlineInBlock(html) {
  let fixed = html;
  for (const t of ['strong', 'em', 'b', 'i', 'u']) {
    const opens = (fixed.match(new RegExp(`<${t}(?:\\s[^>]*)?>`, 'gi')) || []).length;
    const closes = (fixed.match(new RegExp(`</${t}>`, 'gi')) || []).length;
    if (opens > closes) fixed += `</${t}>`.repeat(opens - closes);
    else if (closes > opens) {
      let extra = closes - opens;
      fixed = fixed.replace(new RegExp(`</${t}>`, 'gi'), m => (extra-- > 0 ? '' : m));
    }
  }
  return fixed;
}

// Clean one text block for saving: strip editor attrs, fix list roles,
// unwrap browser junk, balance inline tags. Returns clean outerHTML or ''.
function blockCleanHTML(el) {
  const clone = el.cloneNode(true);
  clone.removeAttribute('contenteditable');
  clone.removeAttribute('data-co-bid');
  clone.classList.remove('co-block', 'co-edited');
  if (!clone.className) clone.removeAttribute('class');
  // browser-inserted junk inside blocks: divs/spans from execCommand
  clone.querySelectorAll('div').forEach(d => {
    if (d.closest('figure')) return; // Webflow figure>div>img structure must stay intact
    const p = document.createElement('p');
    p.innerHTML = d.innerHTML;
    d.replaceWith(...(d.closest('li') ? d.childNodes : [p]));
  });
  clone.querySelectorAll('span').forEach(sp => {
    if (sp.className || sp.id) return;
    const st = sp.getAttribute('style') || '';
    // Google-Docs paste wraps text in styled spans. Convert real formatting
    // to semantic tags, discard the noise — Webflow rejects styled spans in lists.
    const bold = /font-weight\s*:\s*(bold|[7-9]00)/i.test(st);
    const italic = /font-style\s*:\s*italic/i.test(st);
    let repl;
    if (bold && italic) { repl = document.createElement('strong'); const em = document.createElement('em'); em.innerHTML = sp.innerHTML; repl.appendChild(em); }
    else if (bold) { repl = document.createElement('strong'); repl.innerHTML = sp.innerHTML; }
    else if (italic) { repl = document.createElement('em'); repl.innerHTML = sp.innerHTML; }
    if (repl) sp.replaceWith(repl);
    else sp.replaceWith(...sp.childNodes);
  });
  // list hygiene: only <li> children, role attrs (Webflow requirement)
  if (clone.tagName === 'UL' || clone.tagName === 'OL') {
    // Webflow-canonical: ul/ol/li carry ONLY the role attribute. Foreign attrs
    // (style/class/dir from Google-Docs paste) make Webflow silently drop lists.
    Array.from(clone.attributes).forEach(a => clone.removeAttribute(a.name));
    clone.setAttribute('role', 'list');
    Array.from(clone.children).forEach(c => {
      if (c.tagName !== 'LI') { const li = document.createElement('li'); li.innerHTML = c.outerHTML; c.replaceWith(li); }
    });
    clone.querySelectorAll('li').forEach(li => {
      Array.from(li.attributes).forEach(a => li.removeAttribute(a.name));
      li.setAttribute('role', 'listitem');
    });
    if (!clone.querySelector('li')) return '';
  }
  // drop empty blocks
  const isEmpty = !clone.textContent.trim() && !clone.querySelector('img,iframe,video,embed');
  if (isEmpty) return '';
  return balanceInlineInBlock(clone.outerHTML);
}

// ── Table editing: parse to structured data, rebuild deterministically ──
// A table edited through structured data can never be malformed HTML.
function getAttrString(el) {
  return Array.from(el.attributes || []).map(a => ` ${a.name}="${String(a.value).replace(/"/g, '&quot;')}"`).join('');
}
function parseTableHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return null;
  // Preserve whatever WRAPS the table (w-embed div, figure). Webflow rich text
  // does not support bare <table> — publishing one gets its tags stripped and
  // the content flattens into run-together text. The wrapper must survive edits.
  const startIdx = html.search(/<table[\s>]/i);
  const endIdx = html.toLowerCase().lastIndexOf('</table>');
  const prefix = startIdx > 0 ? html.slice(0, startIdx) : '';
  const suffix = endIdx !== -1 ? html.slice(endIdx + '</table>'.length) : '';
  const rows = Array.from(table.querySelectorAll('tr')).map(tr => ({
    cells: Array.from(tr.children).filter(c => /^(TD|TH)$/.test(c.tagName)).map(c => ({
      tag: c.tagName.toLowerCase(),
      attrs: getAttrString(c),
      html: c.innerHTML,
    })),
  })).filter(r => r.cells.length);
  if (!rows.length) return null;
  return { attrs: getAttrString(table), rows, hasThead: !!table.querySelector('thead'), prefix, suffix };
}
function buildTableHTML({ attrs, rows, hasThead, prefix = '', suffix = '' }) {
  const rowHTML = r => `<tr>${r.cells.map(c => `<${c.tag}${c.attrs}>${c.html}</${c.tag}>`).join('')}</tr>`;
  let t;
  if (hasThead && rows.length > 1) {
    t = `<table${attrs}><thead>${rowHTML(rows[0])}</thead><tbody>${rows.slice(1).map(rowHTML).join('')}</tbody></table>`;
  } else if (hasThead && rows.length === 1) {
    t = `<table${attrs}><thead>${rowHTML(rows[0])}</thead></table>`;
  } else {
    t = `<table${attrs}><tbody>${rows.map(rowHTML).join('')}</tbody></table>`;
  }
  return prefix + t + suffix;
}

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

  /* ── Block editor ── */
  .co-editor .co-block { position: relative; border-left: 3px solid transparent; padding-left: 9px; margin-left: -12px; outline: none; border-radius: 2px; transition: background .12s, border-color .12s; }
  .co-editor .co-block:focus { border-left-color: #bae6fd; background: #f8fbff; }
  .co-editor .co-block.co-edited { border-left-color: #0ea5e9; background: #eff8ff; }
  .co-editor .co-block.co-edited::after { content: 'edited'; position: absolute; right: 6px; top: 2px; font-size: 10px; font-weight: 600; color: #0284c7; background: #e0f2fe; padding: 1px 7px; border-radius: 99px; pointer-events: none; }
  .co-widget-shell { margin: 1rem 0; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafbfc; padding: 10px; user-select: none; cursor: default; }
  .co-widget-label { font-size: 11px; font-weight: 600; letter-spacing: .02em; color: #64748b; margin-bottom: 8px; display: flex; gap: 6px; align-items: center; text-transform: uppercase; }
  .co-widget-shell iframe { width: 100% !important; aspect-ratio: 16/9; height: auto !important; min-height: 320px; border: 0; }
  .co-widget-shell video { width: 100%; height: auto; }
  .co-widget-shell table { pointer-events: none; }
  .co-widget-label { justify-content: space-between; }
  .co-widget-actions { display: inline-flex; gap: 6px; }
  .co-widget-actions button { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #334155; cursor: pointer; text-transform: none; letter-spacing: 0; }
  .co-widget-actions button:hover { border-color: #0ea5e9; color: #0ea5e9; }
  .co-widget-shell.co-edited { border-color: #0ea5e9; background: #f0f9ff; }
  .co-widget-shell.co-edited .co-widget-label::before { content: 'edited · '; color: #0284c7; }
`;

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
  const [metaTitle, setMetaTitle] = useState('');
  const [metaSeoDescription, setMetaSeoDescription] = useState('');
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
  const [tableEditor, setTableEditor] = useState({ show: false, wid: null, attrs: '', hasThead: false, rows: [], prefix: '', suffix: '' });
  const [embedEditor, setEmbedEditor] = useState({ show: false, wid: null, html: '', error: '' });
  const [editMode, setEditMode] = useState('edit');
  const [showHighlights, setShowHighlights] = useState(true);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [copied, setCopied] = useState(false);
  const [detectedSiteId, setDetectedSiteId] = useState(null);

  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [contentVersion, setContentVersion] = useState(0);

  useEffect(() => {
    const s = localStorage.getItem('contentops_config');
    if (s) { const p = JSON.parse(s); setSavedConfig(p); setConfig(p); }
    const g = localStorage.getItem('contentops_gsc_data');
    if (g) { try { setGscData(JSON.parse(g)); } catch {} }
  }, []);

  // ══════════════════════════════════════════════
  // BLOCK-BASED EDITOR
  // The container is NOT editable. Each paragraph/heading/list is its own
  // small contentEditable island. Widgets/tables/videos are locked shells —
  // their original HTML is stored in widgetStoreRef and returned VERBATIM
  // on save, so the browser can never alter them.
  // ══════════════════════════════════════════════
  const widgetStoreRef = useRef(new Map());   // wid → current html string (returned verbatim on save)
  const widgetOrigRef = useRef(new Map());    // wid → html at load (for edited-highlight)
  const blockOrigRef = useRef(new Map());     // bid → original clean html (for edit-highlight)
  const lastFocusedBlockRef = useRef(null);
  const blockSeqRef = useRef(0);

  const makeTextBlockAttrs = (el, bid) => {
    el.classList.add('co-block');
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-co-bid', bid);
  };

  const buildEditorDOM = useCallback((html) => {
    const container = editorRef.current;
    if (!container) return;
    widgetStoreRef.current = new Map();
    widgetOrigRef.current = new Map();
    blockOrigRef.current = new Map();
    const doc = new DOMParser().parseFromString(`<div id="__co_root">${html || '<p><br></p>'}</div>`, 'text/html');
    const root = doc.getElementById('__co_root');
    const parts = [];
    let wid = 0;

    Array.from(root.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (!t) return;
        const p = doc.createElement('p'); p.textContent = t; node = p;
      }
      if (node.nodeType !== 1) return;

      if (isWidgetElement(node)) {
        const id = 'w' + (wid++);
        widgetStoreRef.current.set(id, node.outerHTML);
        widgetOrigRef.current.set(id, node.outerHTML);
        const isTable = node.tagName === 'TABLE' || !!node.querySelector?.('table');
        parts.push(
          `<div class="co-widget-shell" contenteditable="false" data-co-wid="${id}">` +
          `<div class="co-widget-label"><span>🔒 ${widgetLabel(node)} — protected</span>` +
          `<span class="co-widget-actions">` +
          `<button type="button" data-co-action="edit" data-co-target="${id}">${isTable ? '✏️ Edit table' : '</> Edit embed'}</button>` +
          `<button type="button" data-co-action="delete" data-co-target="${id}">🗑</button>` +
          `</span></div>` +
          node.outerHTML + `</div>`
        );
      } else {
        const bid = 'b' + (blockSeqRef.current++);
        makeTextBlockAttrs(node, bid);
        parts.push(node.outerHTML);
      }
    });

    container.innerHTML = parts.join('\n') || '<p class="co-block" contenteditable="true" data-co-bid="b0"><br></p>';
    // snapshot originals for edit-highlighting
    container.querySelectorAll('.co-block').forEach(b => {
      blockOrigRef.current.set(b.getAttribute('data-co-bid'), blockCleanHTML(b));
    });
  }, []);

  useEffect(() => {
    if (editMode === 'edit' && editorRef.current) {
      buildEditorDOM(editedContent);
    }
  }, [editMode, contentVersion]);

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

  // Deterministic reassembly: widgets come back from the store VERBATIM,
  // text blocks come from the DOM, cleaned per-block.
  const assembleContent = useCallback(() => {
    const container = editorRef.current;
    if (!container) return liveContentRef.current || editedContent;
    const parts = [];
    Array.from(container.children).forEach(child => {
      if (child.classList?.contains('co-widget-shell')) {
        const orig = widgetStoreRef.current.get(child.getAttribute('data-co-wid'));
        if (orig) parts.push(orig);
      } else if (child.classList?.contains('co-block')) {
        const html = blockCleanHTML(child);
        if (html) parts.push(html);
      }
    });
    return parts.join('\n');
  }, [editedContent]);

  const syncFromEditor = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const html = assembleContent();
      liveContentRef.current = html;
      setEditedContent(html);
    }, 500);
  }, [assembleContent]);

  const flushEditorContent = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    const html = assembleContent();
    liveContentRef.current = html;
    setEditedContent(html);
    return html;
  }, [assembleContent]);

  // per-block input: refresh edit-highlight, then debounced sync
  const handleBlockInput = useCallback((e) => {
    const block = e.target?.closest?.('.co-block');
    if (block) {
      const bid = block.getAttribute('data-co-bid');
      const orig = blockOrigRef.current.get(bid);
      block.classList.toggle('co-edited', blockCleanHTML(block) !== orig);
    }
    syncFromEditor();
  }, [syncFromEditor]);

  const handleEditorFocusIn = useCallback((e) => {
    const block = e.target?.closest?.('.co-block');
    if (block) lastFocusedBlockRef.current = block;
  }, []);

  // Enter splits into a new block; Backspace on an empty block removes it.
  // Inside lists, Enter behaves natively (new <li>) except on an empty item,
  // which exits the list into a fresh paragraph block.
  const handleEditorKeyDown = useCallback((e) => {
    const block = e.target?.closest?.('.co-block');
    if (!block) return;
    const isList = block.tagName === 'UL' || block.tagName === 'OL';
    const sel = window.getSelection();

    if (e.key === 'Enter' && !e.shiftKey) {
      if (isList) {
        const li = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest?.('li');
        if (li && !li.textContent.trim()) {
          e.preventDefault();
          li.remove();
          const bid = 'b' + (blockSeqRef.current++);
          const p = document.createElement('p');
          makeTextBlockAttrs(p, bid);
          p.innerHTML = '<br>';
          block.after(p);
          blockOrigRef.current.set(bid, '');
          if (!block.querySelector('li')) block.remove();
          const r = document.createRange(); r.setStart(p, 0); r.collapse(true);
          sel.removeAllRanges(); sel.addRange(r); p.focus();
          syncFromEditor();
        }
        return; // native <li> behavior otherwise
      }
      e.preventDefault();
      const range = sel.getRangeAt(0);
      const after = range.cloneRange();
      after.selectNodeContents(block);
      after.setStart(range.endContainer, range.endOffset);
      const frag = after.extractContents();
      const bid = 'b' + (blockSeqRef.current++);
      const p = document.createElement('p');
      makeTextBlockAttrs(p, bid);
      p.appendChild(frag);
      if (!p.textContent.trim() && !p.querySelector('img')) p.innerHTML = '<br>';
      if (!block.textContent.trim() && !block.querySelector('img')) block.innerHTML = '<br>';
      block.after(p);
      blockOrigRef.current.set(bid, '');
      p.classList.toggle('co-edited', blockCleanHTML(p) !== '');
      const r = document.createRange(); r.setStart(p, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r); p.focus();
      syncFromEditor();
      return;
    }

    if (e.key === 'Backspace' && !isList) {
      const empty = !block.textContent.trim() && !block.querySelector('img,iframe,video');
      if (empty) {
        e.preventDefault();
        let prev = block.previousElementSibling;
        while (prev && !prev.classList.contains('co-block')) prev = prev.previousElementSibling;
        block.remove();
        if (prev) {
          prev.focus();
          const r = document.createRange();
          r.selectNodeContents(prev); r.collapse(false);
          sel.removeAllRanges(); sel.addRange(r);
        }
        syncFromEditor();
      }
    }
  }, [syncFromEditor]);

  const execCmd = (cmd, val) => {
    // operates within the focused block island — safe by construction
    document.execCommand(cmd, false, val || null);
    const block = lastFocusedBlockRef.current;
    if (block?.isConnected) {
      const bid = block.getAttribute('data-co-bid');
      block.classList.toggle('co-edited', blockCleanHTML(block) !== blockOrigRef.current.get(bid));
    }
    syncFromEditor();
  };

  const currentBlock = () => {
    const sel = window.getSelection();
    if (sel.rangeCount) {
      let n = sel.getRangeAt(0).startContainer;
      const el = n.nodeType === 1 ? n : n.parentElement;
      const b = el?.closest?.('.co-block');
      if (b) return b;
    }
    return lastFocusedBlockRef.current?.isConnected ? lastFocusedBlockRef.current : null;
  };

  const formatHeading = (level) => {
    const block = currentBlock();
    if (!block || block.tagName === 'UL' || block.tagName === 'OL') { setShowHeadingMenu(false); return; }
    const targetTag = block.tagName === `H${level}` ? 'p' : `h${level}`;
    const bid = block.getAttribute('data-co-bid');
    const next = document.createElement(targetTag);
    next.innerHTML = block.innerHTML;
    if (block.id) next.id = block.id;
    makeTextBlockAttrs(next, bid);
    block.replaceWith(next);
    next.classList.toggle('co-edited', blockCleanHTML(next) !== blockOrigRef.current.get(bid));
    next.focus();
    lastFocusedBlockRef.current = next;
    syncFromEditor();
    setShowHeadingMenu(false);
  };

  const insertListCmd = (type) => {
    const block = currentBlock();
    if (!block) return;
    const bid = block.getAttribute('data-co-bid');

    if (block.tagName === 'UL' || block.tagName === 'OL') {
      // list → paragraphs (one per item)
      const frag = document.createDocumentFragment();
      let firstP = null;
      block.querySelectorAll(':scope > li').forEach(li => {
        const nb = 'b' + (blockSeqRef.current++);
        const p = document.createElement('p');
        makeTextBlockAttrs(p, nb);
        p.innerHTML = li.innerHTML || '<br>';
        blockOrigRef.current.set(nb, '');
        p.classList.add('co-edited');
        frag.appendChild(p);
        if (!firstP) firstP = p;
      });
      block.replaceWith(frag);
      firstP?.focus();
      if (firstP) lastFocusedBlockRef.current = firstP;
    } else {
      // paragraph/heading → list with one item
      const list = document.createElement(type === 'bullet' ? 'ul' : 'ol');
      list.setAttribute('role', 'list');
      makeTextBlockAttrs(list, bid);
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      li.innerHTML = block.innerHTML || '<br>';
      list.appendChild(li);
      block.replaceWith(list);
      list.classList.toggle('co-edited', blockCleanHTML(list) !== blockOrigRef.current.get(bid));
      // caret into the li
      const sel = window.getSelection();
      const r = document.createRange();
      r.selectNodeContents(li); r.collapse(false);
      sel.removeAllRanges(); sel.addRange(r);
      list.focus();
      lastFocusedBlockRef.current = list;
    }
    syncFromEditor();
  };

  const handleEditorPaste = useCallback(() => {
    setTimeout(() => {
      if (!editorRef.current) return;

      editorRef.current.querySelectorAll('li').forEach(li => {
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

      editorRef.current.querySelectorAll('ul, ol').forEach(list => {
        list.removeAttribute('class');
        list.removeAttribute('style');
        list.setAttribute('role', 'list');
      });

      syncFromEditor();
    }, 50);
  }, [syncFromEditor]);

  // ── Widget editing (tables + embeds) ──
  const refreshShell = (wid) => {
    const shell = editorRef.current?.querySelector(`[data-co-wid="${wid}"]`);
    if (!shell) return;
    const html = widgetStoreRef.current.get(wid) || '';
    const label = shell.querySelector('.co-widget-label');
    // keep label bar, replace widget body
    shell.innerHTML = '';
    if (label) shell.appendChild(label);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    Array.from(tmp.childNodes).forEach(n => shell.appendChild(n));
    shell.classList.toggle('co-edited', html !== widgetOrigRef.current.get(wid));
    flushEditorContent();
  };

  const openWidgetEditor = (wid) => {
    const html = widgetStoreRef.current.get(wid);
    if (!html) return;
    const parsed = parseTableHTML(html);
    if (parsed) {
      setTableEditor({ show: true, wid, attrs: parsed.attrs, hasThead: parsed.hasThead, rows: parsed.rows, prefix: parsed.prefix, suffix: parsed.suffix });
    } else {
      setEmbedEditor({ show: true, wid, html, error: '' });
    }
  };

  const deleteWidget = (wid) => {
    if (!confirm('Delete this element? This removes it from the blog.')) return;
    editorRef.current?.querySelector(`[data-co-wid="${wid}"]`)?.remove();
    widgetStoreRef.current.delete(wid);
    flushEditorContent();
  };

  const saveTableEdit = () => {
    const { wid, attrs, hasThead, rows, prefix, suffix } = tableEditor;
    const clean = rows
      .map(r => ({ cells: r.cells.map(c => ({ ...c, html: balanceInlineInBlock(c.html) })) }))
      .filter(r => r.cells.length);
    if (!clean.length) { setStatus({ type: 'error', message: 'Table needs at least one row' }); return; }
    widgetStoreRef.current.set(wid, buildTableHTML({ attrs, hasThead, rows: clean, prefix, suffix }));
    setTableEditor({ show: false, wid: null, attrs: '', hasThead: false, rows: [], prefix: '', suffix: '' });
    refreshShell(wid);
  };

  const saveEmbedEdit = () => {
    const { wid, html } = embedEditor;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const els = Array.from(doc.body.children);
    if (!els.length) { setEmbedEditor(m => ({ ...m, error: 'Must be valid HTML with at least one element' })); return; }
    const stray = Array.from(doc.body.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (stray) { setEmbedEditor(m => ({ ...m, error: 'Loose text outside tags — wrap everything in elements' })); return; }
    widgetStoreRef.current.set(wid, els.map(e => e.outerHTML).join('\n'));
    setEmbedEditor({ show: false, wid: null, html: '', error: '' });
    refreshShell(wid);
  };

  const tableCell = (ri, ci, html) => setTableEditor(t => {
    const rows = t.rows.map((r, i) => i !== ri ? r : { cells: r.cells.map((c, j) => j !== ci ? c : { ...c, html }) });
    return { ...t, rows };
  });
  const tableAddRow = () => setTableEditor(t => {
    const cols = t.rows[0]?.cells.length || 2;
    return { ...t, rows: [...t.rows, { cells: Array.from({ length: cols }, () => ({ tag: 'td', attrs: '', html: '' })) }] };
  });
  const tableAddCol = () => setTableEditor(t => ({
    ...t, rows: t.rows.map((r, i) => ({ cells: [...r.cells, { tag: i === 0 && t.hasThead ? 'th' : 'td', attrs: '', html: '' }] })),
  }));
  const tableDelRow = (ri) => setTableEditor(t => ({ ...t, rows: t.rows.filter((_, i) => i !== ri) }));
  const tableDelCol = (ci) => setTableEditor(t => ({ ...t, rows: t.rows.map(r => ({ cells: r.cells.filter((_, j) => j !== ci) })) }));

  // images the writer may edit = images NOT inside locked widget shells
  const editableImages = () =>
    Array.from(editorRef.current?.querySelectorAll('img') || [])
      .filter(img => !img.closest('.co-widget-shell'));

  const handleEditorClick = (e) => {
    const actionBtn = e.target.closest?.('[data-co-action]');
    if (actionBtn) {
      e.preventDefault();
      const wid = actionBtn.getAttribute('data-co-target');
      if (actionBtn.getAttribute('data-co-action') === 'delete') deleteWidget(wid);
      else openWidgetEditor(wid);
      return;
    }
    if (e.target.closest?.('.co-widget-shell')) return; // locked — view only
    if (e.target.tagName === 'IMG') {
      const imgs = editableImages();
      setImageAltModal({ show: true, src: e.target.src, currentAlt: e.target.alt || '', index: imgs.indexOf(e.target), isUpload: false, file: null, error: '' });
      return;
    }
    let el = e.target;
    while (el && el !== editorRef.current) {
      if (el.tagName === 'A') {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        setEditingLink(el);
        setLinkUrl(normalizeHref(el.href));
        setLinkText(el.textContent || '');
        setShowLinkModal(true);
        return;
      }
      el = el.parentElement;
    }
  };

  const openLinkModal = () => {
    saveRange();
    const sel = window.getSelection();
    if (sel.rangeCount) {
      let el = sel.getRangeAt(0).commonAncestorContainer;
      while (el && el !== editorRef.current) {
        if (el.tagName === 'A') { setEditingLink(el); setLinkUrl(normalizeHref(el.href)); setLinkText(el.textContent); setShowLinkModal(true); return; }
        el = el.parentElement;
      }
    }
    setEditingLink(null); setLinkUrl(''); setLinkText(''); setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkUrl) return;
    if (editingLink) {
      editingLink.setAttribute('href', linkUrl);
      editingLink.setAttribute('target', '_blank');
      editingLink.setAttribute('rel', 'noopener noreferrer');
      if (linkText.trim()) editingLink.textContent = linkText;
    } else {
      restoreRange();
      const sel = window.getSelection();
      const selectedText = sel.toString();
      const a = document.createElement('a');
      a.setAttribute('href', linkUrl); a.target = '_blank'; a.rel = 'noopener noreferrer';
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

      if (!editorRef.current) throw new Error('Editor not available');

      // insert as its OWN block after the last-focused block (or at the end)
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = imageAltModal.currentAlt.trim();
      img.loading = 'lazy';
      img.style.cssText = 'max-width:100%;height:auto;display:block;margin:0.5rem 0;border-radius:6px';

      const bid = 'b' + (blockSeqRef.current++);
      const p = document.createElement('p');
      makeTextBlockAttrs(p, bid);
      p.appendChild(img);
      blockOrigRef.current.set(bid, '');
      p.classList.add('co-edited');

      const anchor = lastFocusedBlockRef.current?.isConnected ? lastFocusedBlockRef.current : null;
      if (anchor) anchor.after(p);
      else editorRef.current.appendChild(p);

      flushEditorContent();

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
    const imgs = editableImages();
    if (imgs?.[imageAltModal.index]) {
      imgs[imageAltModal.index].alt = imageAltModal.currentAlt;
      const b = imgs[imageAltModal.index].closest('.co-block');
      if (b) b.classList.toggle('co-edited', blockCleanHTML(b) !== blockOrigRef.current.get(b.getAttribute('data-co-bid')));
      syncFromEditor();
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' });
  };

  const deleteImage = () => {
    if (!confirm('Delete this image?')) return;
    const imgs = editableImages();
    if (imgs?.[imageAltModal.index]) {
      const img = imgs[imageAltModal.index];
      const block = img.closest('.co-block');
      (img.closest('figure') || img).remove();
      if (block && !block.textContent.trim() && !block.querySelector('img')) block.remove();
      syncFromEditor();
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1, isUpload: false, file: null, error: '' });
  };

  const switchToHtmlMode = () => { const html = flushEditorContent(); setHtmlSource(html); setEditMode('html'); };

  const applyHtmlSource = () => {
    setEditedContent(htmlSource);
    setContentVersion(v => v + 1);
    setEditMode('edit');
  };

  const copyHTMLToClipboard = () => {
    const html = flushEditorContent();
    const cleaned = sanitizeListHTML(html);
    navigator.clipboard.writeText(cleaned).then(() => {
      setCopied(true);
      setStatus({ type: 'success', message: 'HTML copied!' });
      setTimeout(() => { setCopied(false); setStatus({ type: '', message: '' }); }, 3000);
    });
  };

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
    setMetaTitle(blog.fieldData['meta-title'] || title);
    setMetaSeoDescription(blog.fieldData['meta-description'] || blog.fieldData['excerpt'] || '');

    const gscInfo = getGscKeywordsForBlog(blog);
    const hasGsc = gscInfo?.hasKeywords && gscInfo.keywords.length > 0;

    setStatus({ type: 'info', message: hasGsc ? `Optimizing with ${gscInfo.keywords.length} GSC keywords...` : 'Smart analysis in progress...' });

    const original = blog.fieldData['post-body'] || '';

    const brandHints = detectBrandContext(title, original);
    const needsTldr = !hasTldr(original);

    try {
      const smartCheckCtrl = new AbortController();
      const smartCheckTimer = setTimeout(() => smartCheckCtrl.abort(), 300000);
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
          addTldr: needsTldr,
          modelMode: 'hybrid' // 'hybrid' = Fable audits + Sonnet writes | 'fable' = max quality | 'sonnet' = cheapest
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
        tldrAdded: needsTldr && data.tldrAdded,
        changelog: data.changelog || [],
        verified: data.verified || [],
        widgetWarnings: data.widgetWarnings || [],
        skipped: data.skipped || []
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

  const getBlogLiveUrl = (blog, originalContent) => {
    if (gscData?.data) {
      const slug = blog.fieldData.slug || blog.fieldData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const entry = gscData.data[slug];
      if (entry?.url) return entry.url.split('#')[0];
    }
    if (originalContent) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${originalContent}</div>`, 'text/html');
        for (const a of doc.querySelectorAll('a[href]')) {
          const href = a.getAttribute('href');
          if (!href) continue;
          try {
            const url = new URL(href);
            if (url.origin !== window.location.origin && url.hash && url.pathname.length > 1) {
              return url.origin + url.pathname;
            }
          } catch {}
        }
      } catch {}
    }
    return null;
  };

  const fixAnchorLinksForWebflow = (html, blogLiveUrl) => {
    if (!blogLiveUrl) return html;
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstChild;
    root.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#')) { a.setAttribute('href', blogLiveUrl + href); return; }
      try {
        const url = new URL(href);
        if (url.origin === window.location.origin && url.hash) {
          a.setAttribute('href', blogLiveUrl + url.hash);
        }
      } catch {}
    });
    return root.innerHTML;
  };

  // Publish-safe serialization: widgets pass through VERBATIM; only text
  // content goes through list sanitizing + anchor fixing. The old path ran a
  // full DOMParser round-trip over widgets too — undoing byte fidelity.
  const splitForPublish = (html, blogLiveUrl) => {
    const doc = new DOMParser().parseFromString(`<div id="__pub">${html}</div>`, 'text/html');
    const root = doc.getElementById('__pub');
    const parts = [];
    let textBuf = [];
    const flushText = () => {
      if (!textBuf.length) return;
      const chunk = textBuf.join('\n');
      parts.push(fixAnchorLinksForWebflow(sanitizeListHTML(chunk), blogLiveUrl));
      textBuf = [];
    };
    Array.from(root.childNodes).forEach(node => {
      if (node.nodeType === 3) { if (node.textContent.trim()) textBuf.push(node.textContent); return; }
      if (node.nodeType !== 1) return;
      if (isWidgetElement(node)) { flushText(); parts.push(node.outerHTML); }
      else textBuf.push(node.outerHTML);
    });
    flushText();
    return parts.join('\n');
  };

  const publishToWebflow = async () => {
    if (!result || !selectedBlog) return;
    if (!blogTitle.trim()) { setStatus({ type: 'error', message: 'Title empty' }); return; }

    const latestContent = flushEditorContent();
    if (!latestContent.trim()) { setStatus({ type: 'error', message: 'Content empty' }); return; }

    setLoading(true);
    setStatus({ type: 'info', message: 'Publishing...' });

    const blogLiveUrl = getBlogLiveUrl(selectedBlog, result?.originalContent);
    const fixedHtml = splitForPublish(latestContent, blogLiveUrl);
    const fieldData = { name: blogTitle.trim(), 'post-body': fixedHtml };
    fieldData['meta-title'] = (metaTitle.trim() || blogTitle.trim());
    if (metaDescription.trim()) fieldData[metaFieldName] = metaDescription.trim();
    if (metaSeoDescription.trim()) fieldData['meta-description'] = metaSeoDescription.trim();
    if (metaSeoDescription.trim()) fieldData['excerpt'] = metaSeoDescription.trim();

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
        if (d.verify && d.verify.dropped && d.verify.dropped.length) {
          setStatus({ type: 'error', message: `⚠ Published, but Webflow DROPPED content: ${d.verify.dropped.join('; ')}. Do NOT go live — flag Ashwini with this message.` });
          setLoading(false);
          return;
        }
        setStatus({ type: 'success', message: d.verify ? 'Published! ✓ verified — all lists, tables & embeds stored intact' : 'Published!' });
        setView('success');
        setLoading(false);
        return;
      } catch (e) {
        if (attempt === 3) { setStatus({ type: 'error', message: `Failed: ${e.message}` }); setLoading(false); return; }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{EDITOR_STYLES}</style>

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
        {status.message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${status.type === 'error' ? 'bg-red-50 border border-red-200' : status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
            {status.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /> :
             status.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> :
             <Loader className="w-5 h-5 text-blue-500 animate-spin shrink-0 mt-0.5" />}
            <p className={`text-sm ${status.type === 'error' ? 'text-red-800' : status.type === 'success' ? 'text-green-800' : 'text-blue-800'}`}>{status.message}</p>
          </div>
        )}

        {view === 'home' && (
          <div className="text-center max-w-4xl mx-auto pt-12">
            <h1 className="text-5xl font-bold text-[#0f172a] mb-4">Smart Content <span className="text-[#0ea5e9]">Fact-Checking</span></h1>
            <p className="text-lg text-gray-600 mb-8">Brave + Google Search &bull; Claude AI rewrites &bull; GSC keyword optimization</p>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-[#0ea5e9] text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-[#0284c7]">
              {savedConfig ? 'Go to Dashboard' : 'Get Started'}
            </button>
          </div>
        )}

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

        {view === 'review' && result && (
          <div className="space-y-4">
            {result.widgetWarnings?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-red-800 mb-1">⚠ Widget warnings — check before publishing</p>
                {result.widgetWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-red-700">{w}</p>
                ))}
              </div>
            )}
            {result.skipped?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-amber-800 mb-1">⏭ Skipped — apply manually if needed ({result.skipped.length})</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.skipped.map((sk, i) => (
                    <div key={i} className="text-xs text-amber-800 bg-white rounded border border-amber-100 p-2">
                      <span className="font-medium">{sk.where}:</span> {sk.reason}
                      <span className="text-amber-600"> — {sk.why}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.changelog?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm font-semibold text-blue-900 mb-2">📋 What changed ({result.changelog.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.changelog.map((c, i) => (
                    <div key={i} className="text-xs bg-white rounded border border-blue-100 p-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                        c.type === 'fix' ? 'bg-amber-100 text-amber-800' :
                        c.type === 'add' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{c.type.toUpperCase()}</span>
                      <span className="font-medium text-gray-700">{c.where}</span>
                      <p className="text-gray-600 mt-1">{c.reason}</p>
                      {c.from && <p className="text-red-600 mt-0.5 line-through">{c.from}</p>}
                      {c.to && <p className="text-emerald-700 mt-0.5">{c.to}</p>}
                    </div>
                  ))}
                </div>
                {result.verified?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">✓ Verified, no change needed: {result.verified.join(' · ')}</p>
                )}
              </div>
            )}
            {result.changelog?.length === 0 && result.searchesUsed > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-emerald-800">✓ Audit found nothing outdated — blog is current.</p>
              </div>
            )}
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

            <div className="bg-white rounded-lg border p-3 flex items-center gap-4 flex-wrap text-sm">
              <span className="text-gray-600">{result.searchesUsed} searches</span>
              <span className="text-gray-600">{result.duration}s</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium">{result.blogType}</span>
              {result.widgetsProtected > 0 && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-medium">{result.widgetsProtected} widgets protected</span>}
              {highlightedData && <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-xs font-medium">{highlightedData.changesCount} changes</span>}
              {result.tldrAdded && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">TL;DR added</span>}
              {result.fromCache && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">cached</span>}
            </div>

            {/* Title + meta fields — name=meta-title, excerpt=meta-description */}
            <div className="bg-white rounded-lg border p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Blog Title <span className="text-gray-400 normal-case font-normal">(updates: name + meta-title)</span></label>
                <input value={blogTitle} onChange={e => { setBlogTitle(e.target.value); setMetaTitle(e.target.value); }} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Excerpt / Meta Description <span className="text-gray-400 normal-case font-normal">(updates: excerpt + meta-description)</span></label>
                <textarea value={metaSeoDescription} onChange={e => { setMetaSeoDescription(e.target.value); setMetaDescription(e.target.value); }} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] resize-none" />
              </div>
            </div>

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

            {editMode === 'edit' && (
              <div className="bg-white rounded-lg border shadow-sm">
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
                  onInput={handleBlockInput}
                  onClick={handleEditorClick}
                  onKeyDown={handleEditorKeyDown}
                  onFocus={handleEditorFocusIn}
                  onPaste={handleEditorPaste}
                  style={{ minHeight: 600 }}
                />
                <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg text-xs text-gray-500 flex items-center gap-4">
                  <span>🔒 Tables, videos & embeds are protected — use their ✏️ Edit buttons to change them safely</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-500" /> blue edge = your edit</span>
                </div>
              </div>
            )}

            {editMode === 'preview' && (
              <div className="bg-white rounded-lg border shadow-sm">
                <div className="co-editor" style={{ minHeight: 400 }}
                  dangerouslySetInnerHTML={{ __html: showHighlights && highlightedData ? highlightedData.html : editedContent }} />
              </div>
            )}

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

      {tableEditor.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">✏️ Edit table</h3>
              <div className="flex gap-2">
                <button onClick={tableAddRow} className="text-xs px-3 py-1.5 rounded-lg border hover:border-sky-400 hover:text-sky-600">+ Row</button>
                <button onClick={tableAddCol} className="text-xs px-3 py-1.5 rounded-lg border hover:border-sky-400 hover:text-sky-600">+ Column</button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    {tableEditor.rows[0]?.cells.map((_, ci) => (
                      <td key={`del-${ci}`} className="text-center pb-1">
                        <button onClick={() => tableDelCol(ci)} className="text-[10px] text-gray-400 hover:text-red-500" title="Delete column">✕ col</button>
                      </td>
                    ))}
                    <td />
                  </tr>
                  {tableEditor.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.cells.map((cell, ci) => (
                        <td key={ci} className="border border-gray-200 p-0 align-top">
                          <textarea
                            value={cell.html}
                            onChange={e => tableCell(ri, ci, e.target.value)}
                            rows={2}
                            className={`w-full min-w-[120px] p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-sky-300 ${cell.tag === 'th' ? 'font-semibold bg-gray-50' : ''}`}
                          />
                        </td>
                      ))}
                      <td className="pl-2 align-middle">
                        <button onClick={() => tableDelRow(ri)} className="text-[10px] text-gray-400 hover:text-red-500" title="Delete row">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">Cells accept simple HTML (&lt;strong&gt;, &lt;a href&gt;). The table is rebuilt from this grid — it cannot come out malformed.</p>
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => setTableEditor({ show: false, wid: null, attrs: '', hasThead: false, rows: [], prefix: '', suffix: '' })} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveTableEdit} className="px-4 py-2 rounded-lg bg-[#0ea5e9] text-white text-sm font-medium hover:bg-sky-600">Save table</button>
            </div>
          </div>
        </div>
      )}

      {embedEditor.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="px-5 py-3 border-b">
              <h3 className="font-semibold text-gray-800">&lt;/&gt; Edit embed HTML</h3>
              <p className="text-xs text-gray-500 mt-0.5">e.g. swap a YouTube URL. Validated before saving — invalid HTML is rejected.</p>
            </div>
            <div className="p-4">
              <textarea
                value={embedEditor.html}
                onChange={e => setEmbedEditor(m => ({ ...m, html: e.target.value, error: '' }))}
                rows={10}
                spellCheck={false}
                className="w-full border rounded-lg p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              {embedEditor.error && <p className="text-xs text-red-600 mt-2">{embedEditor.error}</p>}
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button onClick={() => setEmbedEditor({ show: false, wid: null, html: '', error: '' })} className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveEmbedEdit} className="px-4 py-2 rounded-lg bg-[#0ea5e9] text-white text-sm font-medium hover:bg-sky-600">Save embed</button>
            </div>
          </div>
        </div>
      )}

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
