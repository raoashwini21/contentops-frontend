import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye, Copy } from 'lucide-react';

const BACKEND_URL = 'https://contentops-backend-production.up.railway.app';

// BOFU Research Prompt (Comparison, Reviews, Alternatives, Pricing)
const BOFU_RESEARCH_PROMPT = `You are a professional fact-checker and researcher. Your job is to:
1. Verify ALL claims in the content: pricing, features, stats, company info, technical specs
2. Use Brave Search strategically: official websites first, 2-3 searches per topic, recent info (2024-2025)
3. Focus on LinkedIn/SalesRobot specifics
4. Check for missing AI/NEW features in competitor comparisons
5. Return structured findings with factChecks and missingFeatures arrays
Be thorough but concise. Focus on accuracy.`;

// TOFU Research Prompt (Educational, Awareness, General Info)
const TOFU_RESEARCH_PROMPT = `You are a professional fact-checker for educational content. Your job is to:
1. Verify general industry claims and statistics about LinkedIn, sales automation, and B2B outreach
2. Use Brave Search to check: industry trends (2024-2025), best practices from authoritative sources, general statistics
3. Focus on educational accuracy: LinkedIn platform stats, general limits/policies, industry benchmarks, common best practices
4. Verify definitions, terminology, and conceptual explanations
5. Check recent trends and developments in the space
Be thorough but focus on educational accuracy, not product specifics. Return structured findings with factChecks array.`;

// MOFU Research Prompt (Consideration, How-To, Frameworks)
const MOFU_RESEARCH_PROMPT = `You are a professional fact-checker for consideration-stage content. Your job is to:
1. Verify framework claims, methodologies, and strategic guidance
2. Use Brave Search to check: use case examples, industry comparisons, solution categories, implementation best practices
3. Focus on buyer guidance: "how to choose" criteria, solution category definitions, implementation timelines, use case validation
4. Check authoritative sources for recommendations and guidance
5. Balance general information with solution category comparisons
Be thorough and balanced. Focus on helping buyers make informed decisions. Return structured findings with factChecks array.`;

// Auto-detect blog type from title
const detectBlogType = (title) => {
  const titleLower = title.toLowerCase();
  
  // BOFU keywords (comparison, alternatives, reviews, pricing)
  const bofuKeywords = ['vs ', ' vs.', 'versus', 'alternative', 'alternatives', 'review', 'pricing', 'comparison', 'compare', 'better than', 'or ', 'which is better', 'worth it', 'pros and cons'];
  
  // TOFU keywords (educational, awareness, general info)
  const tofuKeywords = ['what is', 'what are', 'why', 'top 10', 'top 5', 'tips', 'guide to', 'introduction', 'beginner', 'basics', 'explained', 'definition', 'ultimate guide', 'complete guide'];
  
  // MOFU keywords (consideration, how-to, frameworks)
  const mofuKeywords = ['how to', 'best practices', 'getting started', 'choosing', 'selecting', 'framework', 'strategy', 'guide for', 'steps to', 'ways to', 'mistakes to avoid', 'should you', 'when to use'];
  
  // Check for BOFU
  if (bofuKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'BOFU';
  }
  
  // Check for TOFU
  if (tofuKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'TOFU';
  }
  
  // Check for MOFU
  if (mofuKeywords.some(keyword => titleLower.includes(keyword))) {
    return 'MOFU';
  }
  
  // Default: if contains numbers/lists, likely TOFU; otherwise MOFU
  if (/\d+/.test(titleLower) && (titleLower.includes('tips') || titleLower.includes('ways'))) {
    return 'TOFU';
  }
  
  // Default to MOFU (safest middle ground)
  return 'MOFU';
};

const RESEARCH_PROMPT = BOFU_RESEARCH_PROMPT; // Kept for backwards compatibility

const WRITING_PROMPT = `You are an expert blog rewriter focused on clarity, accuracy, and engagement.

**CRITICAL WRITING RULES:**
NEVER USE: Em-dashes, banned words, sentences over 30 words, markdown syntax
ALWAYS USE: Contractions, active voice, short sentences, HTML bold tags (<strong> or <b>)

**CRITICAL: PRESERVE ALL FORMATTING AND STRUCTURE EXACTLY**
- Keep ALL heading tags (<h1>, <h2>, <h3>, <h4>, <h5>, <h6>) EXACTLY as they are in the original
- Keep ALL heading hierarchy the same - do NOT change H2 to H3, or H3 to H2, etc.
- Keep ALL heading text EXACTLY the same - do NOT rewrite, rephrase, or modify heading content
- Keep ALL heading IDs and attributes unchanged

**ABSOLUTE RULE FOR HEADINGS:**
DO NOT modify heading content in any way. Headings must be copied EXACTLY character-for-character from the original HTML.
Examples:
- Original: <h2 id="best-linkedin-automation-tools">Best LinkedIn Automation Tools</h2>
- CORRECT: Keep it EXACTLY as-is
- WRONG: <h2 id="best-linkedin-automation-tools">Top LinkedIn Automation Tools</h2>
- WRONG: <h2>Best LinkedIn Automation Tools</h2> (missing ID)

- Keep ALL heading text the same unless it contains factual errors
- Keep ALL bold (<strong>, <b>) and italic (<em>, <i>) formatting EXACTLY as-is
- Keep ALL links (<a> tags) EXACTLY as-is - preserve href, target, and all attributes
- Keep ALL paragraph breaks and spacing EXACTLY as they appear in original
- Keep ALL list structures (<ul>, <ol>, <li>) EXACTLY as-is
- Keep ALL class attributes, IDs, and data attributes unchanged

**CRITICAL: LIST STRUCTURE (CRITICAL FOR WEBFLOW):**
- ALWAYS wrap <li> elements in <ul> or <ol> tags
- NEVER put <li> directly inside <p> tags
- CORRECT: <ul role="list"><li role="listitem">Item</li></ul>
- WRONG: <p><li>Item</li></p>
- Lists must have role="list" attribute for Webflow
- List items must have role="listitem" attribute for Webflow

**CRITICAL: PRESERVE ALL SPECIAL ELEMENTS - DO NOT CONVERT TO TEXT**
- Keep ALL <iframe>, <script>, <embed>, <object>, <video>, <audio>, <canvas>, <form> tags EXACTLY as-is
- Keep ALL widget classes (w-embed-, w-widget-, info-widget, widget-, etc.) unchanged
- Keep ALL data attributes (data-*, w-*, webflow-*) unchanged
- Keep the "hidden" class on widget elements - DO NOT remove it
- Keep ALL widget structure and nested elements intact (widget-type, info-widget-heading, info-widget-content, etc.)
- NEVER convert widgets/embeds to text - keep them as functional HTML
- NEVER escape HTML in widgets - keep < > characters not &lt; &gt;

**WHAT YOU CAN CHANGE:**
- Fix factual errors (pricing, features, statistics, dates)
- Remove em-dashes and replace with regular dashes or commas
- Shorten overly long sentences (30+ words)
- Add contractions where natural
- Convert passive voice to active voice
- Bold important terms using <strong> tags

**WHAT YOU CANNOT CHANGE:**
- Heading levels (H1, H2, H3, etc.)
- Paragraph structure and breaks
- List formatting (bullet vs numbered)
- Any HTML structure or nesting
- Widget or embed code
- Image tags or attributes

Return only the complete rewritten HTML content with all images, tables, widgets, iframes, scripts, embeds, and EXACT heading structure preserved with no modifications to formatting.`;

// IMPROVED HIGHLIGHTING LOGIC - Only highlights real content changes
const createHighlightedHTML = (originalHTML, updatedHTML) => {
  // ULTRA-AGGRESSIVE normalization - strip EVERYTHING except actual words
  const normalizeForComparison = (html) => {
    return html
      .replace(/<[^>]+>/g, ' ') // Remove ALL HTML tags
      .replace(/&[a-z]+;/gi, ' ') // Replace HTML entities
      .replace(/[^\w\s]/g, ' ') // Remove all punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase(); // Case insensitive
  };
  
  // Split into blocks
  const splitIntoBlocks = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;
    const blocks = [];
    
    const processNode = (node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toUpperCase();
        const isBlockElement = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'SECTION', 'ARTICLE'].includes(tagName);
        const isSpecialElement = ['TABLE', 'IFRAME', 'EMBED', 'SCRIPT', 'IMG', 'FIGURE', 'VIDEO', 'AUDIO', 'CANVAS', 'OBJECT', 'SVG', 'FORM'].includes(tagName);
        
        if (isBlockElement || isSpecialElement) {
          blocks.push(node.outerHTML);
        } else {
          Array.from(node.childNodes).forEach(processNode);
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        blocks.push(node.textContent);
      }
    };
    
    Array.from(container.childNodes).forEach(processNode);
    return blocks;
  };
  
  const originalBlocks = splitIntoBlocks(originalHTML);
  const updatedBlocks = splitIntoBlocks(updatedHTML);
  
  // Create normalized map
  const originalMap = new Map();
  originalBlocks.forEach((block, idx) => {
    const normalized = normalizeForComparison(block);
    if (normalized && normalized.length > 10) {
      if (!originalMap.has(normalized)) {
        originalMap.set(normalized, []);
      }
      originalMap.get(normalized).push({ html: block, index: idx, used: false });
    }
  });
  
  let highlightedHTML = '';
  let changesCount = 0;
  
  updatedBlocks.forEach((updatedBlock, blockIdx) => {
    const normalizedUpdated = normalizeForComparison(updatedBlock);
    
    // Check if special element (never highlight these)
    const isSpecialElement = 
      updatedBlock.match(/<(table|iframe|embed|script|img|figure|video|audio|canvas|object|svg|form)/i) ||
      updatedBlock.match(/class="[^"]*widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*-widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-embed[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-widget[^"]*"/i) ||
      updatedBlock.match(/data-w-id/i) ||
      updatedBlock.match(/data-widget/i);
    
    if (isSpecialElement) {
      highlightedHTML += updatedBlock;
      return;
    }
    
    // Look for exact normalized match
    const matchingBlocks = originalMap.get(normalizedUpdated);
    if (matchingBlocks && matchingBlocks.length > 0) {
      // Find first unused match
      const match = matchingBlocks.find(m => !m.used);
      if (match) {
        match.used = true;
        highlightedHTML += updatedBlock;
        return;
      }
    }
    
    // No exact match - check for fuzzy match (95% word overlap OR less than 5 different words)
    if (normalizedUpdated.length > 20) {
      let foundSimilar = false;
      const updatedWords = normalizedUpdated.split(/\s+/).filter(w => w.length > 3);
      const updatedWordSet = new Set(updatedWords);
      
      if (updatedWordSet.size > 0) {
        for (const [origNormalized, origBlocks] of originalMap.entries()) {
          const unusedBlock = origBlocks.find(b => !b.used);
          if (!unusedBlock) continue;
          
          const origWords = origNormalized.split(/\s+/).filter(w => w.length > 3);
          const origWordSet = new Set(origWords);
          if (origWordSet.size === 0) continue;
          
          // Count matching words
          let matchCount = 0;
          updatedWordSet.forEach(word => {
            if (origWordSet.has(word)) matchCount++;
          });
          
          // Calculate similarity
          const totalWords = Math.max(updatedWordSet.size, origWordSet.size);
          const similarity = matchCount / totalWords;
          
          // Count different words
          const differentWords = updatedWords.filter(w => !origWordSet.has(w)).length;
          
          // STRICT: Need 95% similarity OR less than 3 different substantive words
          if (similarity >= 0.95 || differentWords < 3) {
            // Just minor changes, don't highlight
            foundSimilar = true;
            unusedBlock.used = true;
            highlightedHTML += updatedBlock;
            return;
          }
        }
      }
      
      if (!foundSimilar) {
        // Real content change - highlight it
        const highlighted = `<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">${updatedBlock}</div>`;
        highlightedHTML += highlighted;
        changesCount++;
        return;
      }
    }
    
    // Default: no highlight
    highlightedHTML += updatedBlock;
  });
  
  return { html: highlightedHTML, changesCount };
};

function VisualEditor({ content, onChange }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  useEffect(() => {
    if (!window.Quill && !document.querySelector('script[src*="quill"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://cdn.quilljs.com/1.3.6/quill.js';
      script.onload = () => initQuill();
      document.body.appendChild(script);
    } else if (window.Quill) {
      initQuill();
    }
  }, []);

  const initQuill = () => {
    if (!editorRef.current || quillRef.current) return;
    const Quill = window.Quill;
    const BlockEmbed = Quill.import('blots/block/embed');
    class ImageBlot extends BlockEmbed {
      static create(value) {
        let node = super.create();
        node.setAttribute('src', value.src || value);
        if (value.alt) node.setAttribute('alt', value.alt);
        node.setAttribute('style', 'max-width: 100%; height: auto;');
        return node;
      }
      static value(node) {
        return { src: node.getAttribute('src'), alt: node.getAttribute('alt') };
      }
    }
    ImageBlot.blotName = 'image';
    ImageBlot.tagName = 'img';
    Quill.register(ImageBlot);
    quillRef.current = new Quill(editorRef.current, {
      theme: 'snow',
      modules: { toolbar: [[{ 'header': [1, 2, 3, 4, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean']] }
    });
    const delta = quillRef.current.clipboard.convert(content);
    quillRef.current.setContents(delta, 'silent');
    quillRef.current.on('text-change', () => { onChange(quillRef.current.root.innerHTML); });
  };
  useEffect(() => {
    if (quillRef.current && content !== quillRef.current.root.innerHTML) {
      const cursorPosition = quillRef.current.getSelection();
      const delta = quillRef.current.clipboard.convert(content);
      quillRef.current.setContents(delta, 'silent');
      if (cursorPosition) { try { quillRef.current.setSelection(cursorPosition); } catch (e) { } }
    }
  }, [content]);
  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200">
      <style>{`.ql-editor img { max-width: 100%; height: auto; display: block; margin: 1rem 0; } .ql-editor h1 { font-size: 2.25rem; font-weight: 700; margin: 2rem 0 1rem 0; } .ql-editor h2 { font-size: 1.875rem; font-weight: 700; margin: 1.75rem 0 1rem 0; } .ql-editor h3 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 0.75rem 0; } .ql-editor h4 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem 0; } .ql-editor table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; border: 1px solid #e5e7eb; } .ql-editor th { background-color: #f3f4f6; padding: 0.75rem; border: 1px solid #e5e7eb; } .ql-editor td { padding: 0.75rem; border: 1px solid #e5e7eb; }`}</style>
      <div ref={editorRef} style={{ minHeight: '600px' }} />
    </div>
  );
}

export default function ContentOps() {
  const [view, setView] = useState('home');
  const [config, setConfig] = useState({ 
    anthropicKey: '', 
    braveKey: '', 
    webflowKey: '', 
    collectionId: '' 
  });
  const [savedConfig, setSavedConfig] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);
  const [viewMode, setViewMode] = useState('changes');
  const [editMode, setEditMode] = useState('visual');
  const [editedContent, setEditedContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [highlightedData, setHighlightedData] = useState(null);
  const [imageAltModal, setImageAltModal] = useState({ show: false, src: '', currentAlt: '', index: -1 });
  const [showHighlights, setShowHighlights] = useState(true);
  const editablePreviewRef = useRef(null);
  const afterViewRef = useRef(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [savedSelection, setSavedSelection] = useState(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaFieldName, setMetaFieldName] = useState('post-summary');
  const [gscData, setGscData] = useState(null);
  const [showGscModal, setShowGscModal] = useState(false);
  const [gscUploading, setGscUploading] = useState(false);
  const [showKeywordPopup, setShowKeywordPopup] = useState(false);
  const [customKeywords, setCustomKeywords] = useState('');
  const [matchedKeywords, setMatchedKeywords] = useState([]);
  const [selectedResearchPrompt, setSelectedResearchPrompt] = useState(BOFU_RESEARCH_PROMPT);
  const [blogCache, setBlogCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }
  }, []);

  useEffect(() => {
    const savedGsc = localStorage.getItem('contentops_gsc_data');
    if (savedGsc) {
      try {
        setGscData(JSON.parse(savedGsc));
      } catch (e) {
        console.error('Failed to load GSC data:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (result && result.content && result.originalContent && !highlightedData) {
      const highlighted = createHighlightedHTML(result.originalContent, result.content);
      setHighlightedData(highlighted);
    }
  }, [result]);

  useEffect(() => {
    if (editablePreviewRef.current && editMode === 'html') {
      editablePreviewRef.current.innerHTML = editedContent;
    }
  }, [editedContent, editMode]);

  // FIXED: No loop + highlights work
  useEffect(() => {
    if (afterViewRef.current && viewMode === 'changes') {
      if (showHighlights) {
        afterViewRef.current.innerHTML = highlightedData?.html || editedContent;
      } else {
        const currentContent = afterViewRef.current.innerHTML;
        const cleanedContent = currentContent.replace(
          /<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">(.*?)<\/div>/gs,
          '$1'
        );
        afterViewRef.current.innerHTML = cleanedContent;
      }
    }
  }, [viewMode, showHighlights, highlightedData]);

  // Ensure all links in editable area are clickable
  useEffect(() => {
    if (afterViewRef.current) {
      const links = afterViewRef.current.querySelectorAll('a');
      links.forEach(link => {
        link.style.color = '#0ea5e9';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
        link.style.pointerEvents = 'auto';
      });
    }
  }, [editedContent, viewMode]);

  const handleEditablePreviewInput = () => {
    if (editablePreviewRef.current) {
      setEditedContent(editablePreviewRef.current.innerHTML);
    }
  };

  const handleAfterViewInput = () => {
    if (!afterViewRef.current) return;
    const rawHTML = afterViewRef.current.innerHTML;
    const cleanedHTML = rawHTML.replace(
      /<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">(.*?)<\/div>/gs,
      '$1'
    );
    setEditedContent(cleanedHTML);
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      setSavedSelection(selection.getRangeAt(0).cloneRange());
    }
  };

  const formatText = (command) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;
    const parentElement = range.commonAncestorContainer.parentElement;
    const tag = command === 'bold' ? 'STRONG' : 'EM';
    let formattedParent = parentElement;
    while (formattedParent && formattedParent !== afterViewRef.current) {
      if (formattedParent.tagName === tag || (command === 'bold' && formattedParent.tagName === 'B') || (command === 'italic' && formattedParent.tagName === 'I')) {
        const text = formattedParent.textContent;
        const textNode = document.createTextNode(text);
        formattedParent.parentNode.replaceChild(textNode, formattedParent);
        if (afterViewRef.current) {
          setEditedContent(afterViewRef.current.innerHTML);
        }
        return;
      }
      formattedParent = formattedParent.parentElement;
    }
    const element = document.createElement(command === 'bold' ? 'strong' : 'em');
    element.textContent = selectedText;
    range.deleteContents();
    range.insertNode(element);
    range.setStartAfter(element);
    range.setEndAfter(element);
    selection.removeAllRanges();
    selection.addRange(range);
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
  };

  // FIXED: Better heading formatting (H1-H4)
  const formatHeading = (level) => {
    if (!afterViewRef.current) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let block = range.startContainer;
    while (block && block !== afterViewRef.current) {
      if (block.nodeType === Node.ELEMENT_NODE && 
          ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(block.tagName)) {
        break;
      }
      block = block.parentNode;
    }
    if (!block || block === afterViewRef.current) {
      const heading = document.createElement(`h${level}`);
      heading.textContent = selection.toString() || 'Heading';
      range.deleteContents();
      range.insertNode(heading);
      range.setStartAfter(heading);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const heading = document.createElement(`h${level}`);
      heading.innerHTML = block.innerHTML;
      block.parentNode.replaceChild(heading, block);
      const newRange = document.createRange();
      newRange.selectNodeContents(heading);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    setEditedContent(afterViewRef.current.innerHTML);
  };

  // FIXED: formatList now adds Webflow attributes
  const formatList = (type) => {
    if (!afterViewRef.current) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let block = range.startContainer;
    
    // Find the nearest block element
    while (block && block !== afterViewRef.current) {
      if (block.nodeType === Node.ELEMENT_NODE && 
          ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(block.tagName)) {
        break;
      }
      block = block.parentNode;
    }
    
    if (!block || block === afterViewRef.current) return;
    
    // Check if already in a list
    const parentList = block.closest('ul, ol');
    if (parentList) {
      // Already in a list - unwrap it
      const fragment = document.createDocumentFragment();
      Array.from(parentList.children).forEach(li => {
        const p = document.createElement('p');
        p.innerHTML = li.innerHTML;
        fragment.appendChild(p);
      });
      parentList.parentNode.replaceChild(fragment, parentList);
    } else {
      // Create new list with Webflow attributes
      const listElement = document.createElement(type === 'bullet' ? 'ul' : 'ol');
      listElement.setAttribute('role', 'list');  // Add Webflow attribute
      
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');  // Add Webflow attribute
      li.innerHTML = block.innerHTML;
      listElement.appendChild(li);
      block.parentNode.replaceChild(listElement, block);
    }
    
    setEditedContent(afterViewRef.current.innerHTML);
  };

  const insertLink = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let element = range.commonAncestorContainer;
      while (element && element !== afterViewRef.current) {
        if (element.tagName === 'A') {
          setEditingLink(element);
          setLinkUrl(element.href);
          setLinkText(element.textContent || '');
          setShowLinkModal(true);
          return;
        }
        element = element.parentElement;
      }
    }
    saveSelection();
    setEditingLink(null);
    setLinkUrl('');
    setLinkText('');
    setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkUrl) return;
    if (editingLink) {
      // Editing existing link
      editingLink.href = linkUrl;
      editingLink.target = '_blank';
      editingLink.rel = 'noopener noreferrer';
      if (linkText && linkText.trim()) {
        editingLink.textContent = linkText;
      }
    } else {
      // Creating new link
      if (savedSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelection.cloneRange());
        const selectedText = selection.toString();
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#0ea5e9';
        link.style.textDecoration = 'underline';
        // Use linkText if provided, otherwise use selected text or URL
        link.textContent = linkText?.trim() || selectedText || linkUrl;
        if (selectedText) {
          savedSelection.deleteContents();
        }
        savedSelection.insertNode(link);
        savedSelection.setStartAfter(link);
        savedSelection.collapse(true);
      }
    }
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
    setEditingLink(null);
  };

  const insertImage = () => {
    saveSelection();
    setShowImageModal(true);
  };

  const applyImage = async () => {
    let imageSrc = '';
    if (imageFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        imageSrc = base64;
      } catch (error) {
        console.error('Error reading image file:', error);
        return;
      }
    } else if (imageUrl) {
      imageSrc = imageUrl;
    } else {
      return;
    }
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '1rem 0';
    img.alt = 'Inserted image';
    if (savedSelection) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelection.cloneRange());
      savedSelection.insertNode(img);
      savedSelection.setStartAfter(img);
      savedSelection.collapse(true);
    } else if (afterViewRef.current) {
      afterViewRef.current.appendChild(img);
    }
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    setShowImageModal(false);
    setImageUrl('');
    setImageFile(null);
  };

  const handleContentClick = (e) => {
    // Check if click is on an image
    if (e.target.tagName === 'IMG') {
      const src = e.target.src;
      const alt = e.target.alt || '';
      const imgIndex = Array.from(e.currentTarget.querySelectorAll('img')).indexOf(e.target);
      setImageAltModal({ show: true, src, currentAlt: alt, index: imgIndex });
      return;
    }
    
    // Check if click is on a link or inside a link
    let targetElement = e.target;
    while (targetElement && targetElement !== e.currentTarget) {
      if (targetElement.tagName === 'A') {
        console.log('Link clicked:', targetElement.href, targetElement.textContent);
        // Allow Ctrl/Cmd+Click to open link in new tab
        if (e.ctrlKey || e.metaKey) {
          console.log('Ctrl/Cmd+Click detected, opening link');
          return;
        }
        // Prevent default link behavior and open edit modal
        e.preventDefault();
        e.stopPropagation();
        console.log('Opening link editor modal');
        setEditingLink(targetElement);
        setLinkUrl(targetElement.href);
        setLinkText(targetElement.textContent || '');
        setShowLinkModal(true);
        return;
      }
      targetElement = targetElement.parentElement;
    }
  };

  const updateImageAlt = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent, 'text/html');
    const images = doc.querySelectorAll('img');
    if (images[imageAltModal.index]) {
      images[imageAltModal.index].setAttribute('alt', imageAltModal.currentAlt);
      const newContent = doc.body.innerHTML;
      setEditedContent(newContent);
      // Update the DOM immediately
      if (afterViewRef.current) {
        afterViewRef.current.innerHTML = newContent;
      }
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  const deleteImage = () => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent, 'text/html');
    const images = doc.querySelectorAll('img');
    if (images[imageAltModal.index]) {
      const imageElement = images[imageAltModal.index];
      const figure = imageElement.closest('figure');
      if (figure) {
        figure.remove();
      } else {
        imageElement.remove();
      }
      const newContent = doc.body.innerHTML;
      setEditedContent(newContent);
      if (afterViewRef.current) {
        afterViewRef.current.innerHTML = newContent;
      }
    }
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  // Copy HTML to clipboard
  const copyHTMLToClipboard = () => {
    // Get the sanitized HTML (same as what would be published)
    const sanitizedHTML = sanitizeListHTML(editedContent);
    
    navigator.clipboard.writeText(sanitizedHTML).then(() => {
      setStatus({ 
        type: 'success', 
        message: '✅ HTML copied to clipboard! You can now use it in your n8n workflow.' 
      });
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      setStatus({ 
        type: 'error', 
        message: '❌ Failed to copy HTML. Please try again.' 
      });
    });
  };

  const handleGscUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name, 'Type:', file.type);
    setGscUploading(true);
    setStatus({ type: 'info', message: 'Processing GSC data...' });
    
    // Check if it's XLSX
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (isXLSX) {
      // Parse XLSX file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Load SheetJS if not already loaded
          if (typeof XLSX === 'undefined') {
            console.log('Loading SheetJS...');
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          
          console.log('Parsing XLSX...');
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          console.log('Sheet names:', workbook.SheetNames);
          
          // Find Queries and Pages sheets
          const queriesSheet = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('quer')
          );
          const pagesSheet = workbook.SheetNames.find(name => 
            name.toLowerCase().includes('page')
          );
          
          if (!queriesSheet || !pagesSheet) {
            throw new Error('Could not find Queries or Pages sheet. Found: ' + workbook.SheetNames.join(', '));
          }
          
          // Parse sheets to JSON
          const queriesData = XLSX.utils.sheet_to_json(workbook.Sheets[queriesSheet]);
          const pagesData = XLSX.utils.sheet_to_json(workbook.Sheets[pagesSheet]);
          
          console.log('Queries rows:', queriesData.length);
          console.log('Pages rows:', pagesData.length);
          
          // Process and match keywords to pages
          const gscByUrl = {};
          let totalMatches = 0;
          
          // First, index all queries
          const allQueries = queriesData.map(row => ({
            query: (row['Top queries'] || row['Query'] || row['Queries'] || '').toLowerCase(),
            clicks: parseFloat(row['Clicks'] || 0),
            impressions: parseFloat(row['Impressions'] || 0),
            ctr: parseFloat(row['CTR'] || 0) * 100,
            position: parseFloat(row['Position'] || 0)
          })).filter(q => q.query);
          
          console.log('Total queries:', allQueries.length);
          
          // Process each page
          for (const row of pagesData) {
            const pageUrl = row['Top pages'] || row['Page'] || row['Pages'] || '';
            if (!pageUrl || !pageUrl.includes('/blogs/')) continue;
            
            // Extract slug
            let slug = '';
            try {
              const url = new URL(pageUrl);
              const parts = url.pathname.split('/').filter(p => p);
              slug = parts[parts.length - 1];
            } catch (e) {
              continue;
            }
            
            if (!slug) continue;
            
            // Match keywords to this page
            const slugWords = slug.replace(/-/g, ' ').toLowerCase();
            const matchedKeywords = [];
            
            // Score each keyword for this page
            for (const query of allQueries) {
              let score = 0;
              const queryWords = query.query.split(' ');
              
              // Check word overlap
              for (const word of queryWords) {
                if (word.length > 3 && slugWords.includes(word)) {
                  score += 2;
                }
              }
              
              // Bonus if query is substring of slug or vice versa
              if (slugWords.includes(query.query) || query.query.includes(slug.replace(/-/g, ' '))) {
                score += 5;
              }
              
              // If good match, add it
              if (score >= 4) {
                matchedKeywords.push({
                  ...query,
                  matchScore: score
                });
              }
            }
            
            // Sort by match score then position
            matchedKeywords.sort((a, b) => {
              if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
              return a.position - b.position;
            });
            
            // Take top 10 matched keywords
            const topKeywords = matchedKeywords.slice(0, 10);
            
            if (topKeywords.length > 0) {
              gscByUrl[slug] = {
                url: pageUrl,
                clicks: parseFloat(row['Clicks'] || 0),
                impressions: parseFloat(row['Impressions'] || 0),
                ctr: parseFloat(row['CTR'] || 0) * 100,
                position: parseFloat(row['Position'] || 0),
                keywords: topKeywords,
                hasKeywords: true
              };
              totalMatches++;
            }
          }
          
          console.log('Matched keywords to', totalMatches, 'pages');
          
          if (totalMatches === 0) {
            throw new Error('No keyword matches found. Check that your blog URLs contain keyword-related slugs.');
          }
          
          const gscData = {
            data: gscByUrl,
            uploadedAt: new Date().toISOString(),
            totalMatches,
            blogsCount: Object.keys(gscByUrl).length,
            type: 'xlsx-matched'
          };
          
          localStorage.setItem('contentops_gsc_data', JSON.stringify(gscData));
          setGscData(gscData);
          setStatus({ 
            type: 'success', 
            message: `✅ Matched keywords to ${totalMatches} blogs!` 
          });
          
          console.log('Success! GSC data with keywords stored.');
          setTimeout(() => {
            setStatus({ type: '', message: '' });
            setShowGscModal(false);
          }, 2000);
          
        } catch (error) {
          console.error('XLSX parsing error:', error);
          setStatus({ 
            type: 'error', 
            message: 'Failed: ' + error.message 
          });
        } finally {
          setGscUploading(false);
        }
      };
      
      reader.onerror = () => {
        setStatus({ type: 'error', message: 'Failed to read XLSX file.' });
        setGscUploading(false);
      };
      
      reader.readAsArrayBuffer(file);
      
    } else {
      // Original CSV handling code here (keep for backward compatibility)
      setStatus({ type: 'error', message: 'Please upload an XLSX file from GSC export.' });
      setGscUploading(false);
    }
  };

  const getGscKeywordsForBlog = (blog) => {
    if (!gscData || !gscData.data) {
      console.log('No GSC data available');
      return null;
    }
    
    const slug = blog.fieldData.slug || (blog.fieldData.name && blog.fieldData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    console.log('Checking blog:', blog.fieldData.name, 'Slug:', slug);
    
    const pageData = gscData.data[slug];
    
    if (!pageData) {
      console.log('No GSC data for slug:', slug);
      console.log('Available slugs:', Object.keys(gscData.data).slice(0, 5));
      return null;
    }
    
    console.log('Found GSC data for', slug, ':', {
      keywords: pageData.keywords ? pageData.keywords.length : 0,
      clicks: pageData.clicks,
      position: pageData.position
    });
    
    return {
      hasTraffic: true,
      clicks: pageData.clicks,
      impressions: pageData.impressions,
      position: pageData.position,
      ctr: pageData.ctr,
      url: pageData.url,
      keywords: pageData.keywords || [],
      hasKeywords: pageData.hasKeywords || false
    };
  };

  const continueAnalyzeWithKeywords = async (selectedKeywords) => {
    setShowKeywordPopup(false);
    setLoading(true);
    setView('review');
    setStatus({ type: 'info', message: 'Analyzing blog with keywords...' });
    
    const blog = selectedBlog;
    const fullOriginalContent = blog.fieldData['post-body'] || blog.fieldData['blog-content'] || '';
    
    try {
      const gscInfo = getGscKeywordsForBlog(blog);
      
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogContent: fullOriginalContent,
          title: blogTitle,
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          researchPrompt: selectedResearchPrompt,
          writingPrompt: WRITING_PROMPT,
          gscKeywords: selectedKeywords,
          gscPosition: gscInfo ? gscInfo.position : null
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setOriginalContent(fullOriginalContent);
      setEditedContent(data.content);
      setResult(data);
      
      const highlighted = createHighlightedHTML(fullOriginalContent, data.content);
      setHighlightedData(highlighted);
      
      setStatus({ type: 'success', message: data.message || 'Analysis complete!' });
      setLoading(false);
      
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus({ type: 'error', message: error.message || 'Failed to analyze blog' });
      setLoading(false);
      setView('dashboard');
    }
  };

  const testWebflowConnection = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Testing Webflow connection...' });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second test

      console.log('Testing Webflow API...');
      console.log('Collection ID:', config.collectionId);
      console.log('Token:', config.webflowKey ? 'Present (hidden)' : 'Missing');

      const response = await fetch(
        `${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&limit=1&offset=0`,
        {
          headers: {
            'Authorization': `Bearer ${config.webflowKey}`,
            'accept': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(`Webflow API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('Success! Sample data:', data);

      setStatus({
        type: 'success',
        message: `✅ Connection successful! Test returned ${data.items?.length || 0} blog (Webflow API working).`
      });

      // Auto-load blogs after successful test
      setTimeout(() => fetchBlogs(), 1000);

    } catch (error) {
      console.error('Connection test failed:', error);
      
      if (error.name === 'AbortError') {
        setStatus({ 
          type: 'error', 
          message: '❌ Connection test timed out after 15s. Webflow API is not responding. Check: 1) Token valid? 2) Collection ID correct? 3) Webflow status page?' 
        });
      } else {
        setStatus({ 
          type: 'error', 
          message: `❌ Connection failed: ${error.message}. Check your Webflow token and Collection ID.` 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogsQuick = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: '⚡ Quick loading recent blogs...' });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        `${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&limit=10&offset=0`,
        {
          headers: {
            'Authorization': `Bearer ${config.webflowKey}`,
            'accept': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Deduplicate by ID
      const uniqueItems = [];
      const seenIds = new Set();
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          uniqueItems.push(item);
        }
      }

      setBlogs(uniqueItems);
      setBlogCache(uniqueItems);
      setCacheTimestamp(Date.now());
      
      setStatus({
        type: 'success',
        message: `⚡ Quick loaded ${uniqueItems.length} recent blogs`
      });
      setView('dashboard');

    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ 
          type: 'error', 
          message: 'Quick load timed out. Webflow API is very slow - try again or check Webflow status.' 
        });
      } else {
        setStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = () => {
    if (!config.anthropicKey || !config.braveKey || !config.webflowKey || !config.collectionId) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }
    localStorage.setItem('contentops_config', JSON.stringify(config));
    setSavedConfig(config);
    setStatus({ type: 'success', message: 'Configuration saved!' });
    testWebflowConnection(); // Test first instead of full load
  };

  const fetchBlogs = async (forceRefresh = false) => {
    // Check cache (valid for 10 minutes)
    const cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : Infinity;
    const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
    
    if (!forceRefresh && blogCache && cacheAge < CACHE_DURATION) {
      console.log('✓ Using cached blogs');
      setBlogs(blogCache);
      const minutesAgo = Math.round(cacheAge / 60000);
      setStatus({ 
        type: 'success', 
        message: `${blogCache.length} blogs (cached ${minutesAgo}m ago)` 
      });
      setView('dashboard');
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Fetching blogs... This may take 1-2 minutes.' });

    try {
      let allItems = [];
      const limit = 100;
      let offset = 0;
      let hasMore = true;
      let totalFetched = 0;

      // 3 minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      while (hasMore) {
        setStatus({ 
          type: 'info', 
          message: `Fetching blogs... ${allItems.length} unique blogs loaded${offset > 0 ? ', loading more...' : ''}` 
        });

        const response = await fetch(
          `${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&limit=${limit}&offset=${offset}`,
          {
            headers: {
              'Authorization': `Bearer ${config.webflowKey}`,
              'accept': 'application/json'
            },
            signal: controller.signal
          }
        );

        if (!response.ok) {
          clearTimeout(timeoutId);
          throw new Error(`Failed at offset ${offset}: ${response.status}`);
        }

        const data = await response.json();
        const items = data.items || [];

        // Check if backend served from cache (returns ALL blogs at once)
        const cacheHit = response.headers.get('X-Cache') === 'HIT';
        
        if (cacheHit && offset === 0) {
          // Backend returned ALL cached blogs in one shot - no need to paginate!
          console.log(`✅ Backend cache hit - received all ${items.length} blogs at once`);
          allItems = items; // Replace, don't append
          hasMore = false; // Stop pagination
          
          // Deduplicate (just in case)
          const uniqueItems = [];
          const seenIds = new Set();
          for (const item of allItems) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              uniqueItems.push(item);
            }
          }
          allItems = uniqueItems;
          setBlogs([...allItems]);
          break; // Exit loop immediately
        }

        // Normal pagination (cache miss - fetching from Webflow)
        // Deduplicate by ID before adding
        const uniqueNewItems = items.filter(item => !allItems.some(existing => existing.id === item.id));
        allItems.push(...uniqueNewItems);
        totalFetched += items.length;

        // Update UI progressively with unique items only
        setBlogs([...allItems]);

        // Stop when fewer than limit returned
        if (items.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
          // Delay to avoid rate limits (only needed when fetching from Webflow)
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      clearTimeout(timeoutId);

      // Final deduplication check
      const finalUniqueItems = [];
      const finalSeenIds = new Set();
      for (const item of allItems) {
        if (!finalSeenIds.has(item.id)) {
          finalSeenIds.add(item.id);
          finalUniqueItems.push(item);
        }
      }

      const duplicatesRemoved = allItems.length - finalUniqueItems.length;

      // Cache results
      setBlogs(finalUniqueItems);
      setBlogCache(finalUniqueItems);
      setCacheTimestamp(Date.now());
      
      setStatus({
        type: 'success',
        message: `✅ Loaded ${finalUniqueItems.length} unique blogs${duplicatesRemoved > 0 ? ` (removed ${duplicatesRemoved} duplicates)` : ''}`
      });
      setView('dashboard');

    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus({ 
          type: 'error', 
          message: 'Request timed out after 3 minutes. Webflow may be slow - try again in a moment.' 
        });
      } else {
        setStatus({ type: 'error', message: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const analyzeBlog = async (blog) => {
    setSelectedBlog(blog);
    setLoading(true);
    
    // Auto-detect blog type from title
    const blogTitle = blog.fieldData.name;
    setBlogTitle(blogTitle);
    
    // Try multiple common field names for meta description and store which one worked
    const fieldChecks = [
      'excerpt',
      'post-summary', 
      'summary',
      'meta-description',
      'description',
      'seo-description'
    ];
    
    let metaDescriptionValue = '';
    let detectedFieldName = 'post-summary'; // default
    
    for (const fieldName of fieldChecks) {
      if (blog.fieldData[fieldName]) {
        metaDescriptionValue = blog.fieldData[fieldName];
        detectedFieldName = fieldName;
        console.log(`✓ Found meta description in field: "${fieldName}"`);
        break;
      }
    }
    
    setMetaDescription(metaDescriptionValue);
    setMetaFieldName(detectedFieldName);
    
    // Debug logging to see available fields
    console.log('=== WEBFLOW FIELD DETECTION ===');
    console.log('All available fields:', Object.keys(blog.fieldData));
    console.log('Field values:');
    Object.entries(blog.fieldData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        console.log(`  ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      }
    });
    console.log('Meta description field used:', detectedFieldName);
    console.log('Meta description value:', metaDescriptionValue ? metaDescriptionValue.substring(0, 100) : '(empty)');
    console.log('===============================');
    
    const blogType = detectBlogType(blogTitle);
    
    // Select appropriate research prompt based on blog type
    let selectedPrompt;
    let blogTypeLabel;
    if (blogType === 'BOFU') {
      selectedPrompt = BOFU_RESEARCH_PROMPT;
      blogTypeLabel = 'BOFU (Comparison/Review)';
    } else if (blogType === 'TOFU') {
      selectedPrompt = TOFU_RESEARCH_PROMPT;
      blogTypeLabel = 'TOFU (Educational)';
    } else {
      selectedPrompt = MOFU_RESEARCH_PROMPT;
      blogTypeLabel = 'MOFU (How-To/Guide)';
    }
    
    setSelectedResearchPrompt(selectedPrompt);
    
    // Check for GSC keywords
    const gscInfo = getGscKeywordsForBlog(blog);
    
    if (gscInfo && gscInfo.hasKeywords && gscInfo.keywords.length > 0) {
      // Show keyword popup
      setMatchedKeywords(gscInfo.keywords);
      setShowKeywordPopup(true);
      setLoading(false);
      return;
    }
    
    // No GSC keywords, proceed with normal analysis
    setStatus({ type: 'info', message: `Smart analysis in progress (${blogTypeLabel})...` });
    const fullOriginalContent = blog.fieldData['post-body'] || '';
    
    // Debug: Check for links in original content
    const linkMatches = fullOriginalContent.match(/<a\s+[^>]*href=/gi);
    console.log('=== LINK DETECTION ===');
    console.log(`Found ${linkMatches ? linkMatches.length : 0} links in original Webflow content`);
    if (linkMatches && linkMatches.length > 0) {
      console.log('Sample links:', fullOriginalContent.match(/<a\s+[^>]*>.*?<\/a>/gi)?.slice(0, 3));
    }
    console.log('======================');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogContent: fullOriginalContent,
          title: blogTitle,
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          researchPrompt: selectedPrompt,
          writingPrompt: WRITING_PROMPT
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      const data = await response.json();
      let updatedContent = data.content || fullOriginalContent;
      updatedContent = updatedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Count links in updated content
      const updatedLinkMatches = updatedContent.match(/<a\s+[^>]*href=/gi);
      const linkCount = updatedLinkMatches ? updatedLinkMatches.length : 0;
      console.log(`Links preserved in updated content: ${linkCount}`);
      
      const highlighted = createHighlightedHTML(fullOriginalContent, updatedContent);
      setHighlightedData(highlighted);
      setResult({
        changes: data.changes || [],
        searchesUsed: data.searchesUsed || 0,
        claudeCalls: data.claudeCalls || 0,
        sectionsUpdated: data.sectionsUpdated || 0,
        content: updatedContent,
        originalContent: fullOriginalContent,
        duration: data.duration || 0,
        blogType: blogType,
        linkCount: linkCount
      });
      setOriginalContent(fullOriginalContent);
      setEditedContent(updatedContent);
      setShowHighlights(true);
      setStatus({ type: 'success', message: `✅ Analysis complete (${blogTypeLabel})!` });
      setView('review');
      setViewMode('changes');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Fix malformed lists before publishing
  const sanitizeListHTML = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;

    // Find all <li> elements that are NOT inside <ul> or <ol>
    const orphanedListItems = Array.from(container.querySelectorAll('li')).filter(li => {
      const parent = li.parentElement;
      return parent && parent.tagName !== 'UL' && parent.tagName !== 'OL';
    });

    if (orphanedListItems.length > 0) {
      console.log(`🔧 Fixing ${orphanedListItems.length} orphaned list items...`);

      const processedLis = new Set();
      
      orphanedListItems.forEach(li => {
        if (processedLis.has(li)) return;
        
        // Find consecutive siblings that are also <li>
        const group = [li];
        processedLis.add(li);
        
        let nextSibling = li.nextElementSibling;
        while (nextSibling && nextSibling.tagName === 'LI' && orphanedListItems.includes(nextSibling)) {
          group.push(nextSibling);
          processedLis.add(nextSibling);
          nextSibling = nextSibling.nextElementSibling;
        }
        
        // Wrap group in <ul>
        if (group.length > 0) {
          const ul = document.createElement('ul');
          ul.setAttribute('role', 'list');
          
          const parent = li.parentElement;
          
          if (parent.tagName === 'P' && parent.children.length === 1 && parent.children[0] === li) {
            group.forEach(item => {
              item.setAttribute('role', 'listitem');
              ul.appendChild(item);
            });
            parent.replaceWith(ul);
          } else {
            parent.insertBefore(ul, li);
            group.forEach(item => {
              item.setAttribute('role', 'listitem');
              ul.appendChild(item);
            });
          }
        }
      });
    }

    // Fix any <p> tags that only contain <li>
    const paragraphs = container.querySelectorAll('p');
    paragraphs.forEach(p => {
      const children = Array.from(p.children);
      const allLi = children.length > 0 && children.every(child => child.tagName === 'LI');
      
      if (allLi) {
        const ul = document.createElement('ul');
        ul.setAttribute('role', 'list');
        children.forEach(li => {
          li.setAttribute('role', 'listitem');
          ul.appendChild(li);
        });
        p.replaceWith(ul);
      }
    });

    return container.innerHTML;
  };

  const publishToWebflow = async () => {
    if (!result || !selectedBlog) return;
    
    // Validation
    if (!blogTitle.trim()) {
      setStatus({ type: 'error', message: 'Title cannot be empty' });
      return;
    }
    
    if (!editedContent.trim()) {
      setStatus({ type: 'error', message: 'Content cannot be empty' });
      return;
    }
    
    setLoading(true);
    setStatus({ type: 'info', message: 'Publishing to Webflow...' });
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        
        if (attempt > 1) {
          setStatus({ type: 'info', message: `Retrying... (Attempt ${attempt}/${maxRetries})` });
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
        
        console.log('Publishing to Webflow:', {
          collectionId: config.collectionId,
          itemId: selectedBlog.id,
          titleLength: blogTitle.length,
          contentLength: editedContent.length,
          metaLength: metaDescription.length,
          metaFieldName: metaFieldName
        });
        
        // Sanitize lists before publishing (browser-side, FREE!)
        const sanitizedContent = sanitizeListHTML(editedContent);
        
        if (sanitizedContent !== editedContent) {
          console.log('✅ Fixed malformed lists before publishing (no credits used - browser-side fix)');
        }
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        
        // Build fieldData with the correct meta description field name
        const fieldData = {
          name: blogTitle.trim(),
          'post-body': sanitizedContent  // Use sanitized content!
        };
        
        // Add meta description to the correct field
        if (metaDescription.trim()) {
          fieldData[metaFieldName] = metaDescription.trim();
        }
        
        const response = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&itemId=${selectedBlog.id}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${config.webflowKey}`, 
            'Content-Type': 'application/json', 
            'accept': 'application/json' 
          },
          body: JSON.stringify({ fieldData }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseData = await response.json();
        console.log('Webflow response:', responseData);
        
        if (!response.ok) {
          throw new Error(responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Success!
        setStatus({ type: 'success', message: '✅ Published successfully!' });
        setView('success');
        setLoading(false);
        return;
        
      } catch (error) {
        console.error(`Publish attempt ${attempt} failed:`, error);
        
        // Handle timeout specifically
        if (error.name === 'AbortError') {
          console.error('Request timed out after 2 minutes');
          if (attempt === maxRetries) {
            setStatus({ 
              type: 'error', 
              message: 'Request timed out. Webflow may be slow - your content might be too large or Webflow is responding slowly.' 
            });
            setLoading(false);
            return;
          }
          continue;
        }
        
        if (attempt === maxRetries) {
          // Final attempt failed
          const errorMessage = error.message || 'Unknown error occurred';
          setStatus({ 
            type: 'error', 
            message: `Failed to publish after ${maxRetries} attempts: ${errorMessage}` 
          });
          setLoading(false);
          return;
        }
        
        // Continue to next retry
        continue;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-[#0f172a] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">ContentOps</span>
            </div>
            <div className="flex items-center gap-4">
              {savedConfig && (
                <>
                  <button onClick={() => setView('dashboard')} className="text-gray-300 hover:text-white font-medium">Dashboard</button>
                  <button onClick={() => setView('setup')} className="text-gray-300 hover:text-white"><Settings className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {view === 'home' && (
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="inline-block px-4 py-2 bg-[#0ea5e9] bg-opacity-10 rounded-full border border-[#0ea5e9] border-opacity-30 mb-6">
                <span className="text-[#0ea5e9] text-sm font-semibold">Powered by Brave Search + Claude AI</span>
              </div>
              <h1 className="text-6xl font-bold text-[#0f172a] mb-4">Smart Content<br /><span className="text-[#0ea5e9]">Fact-Checking</span></h1>
              <p className="text-xl text-gray-600">Brave Search • AI-powered rewrites • Full blog diff view</p>
            </div>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-[#0ea5e9] text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-[#0284c7] shadow-lg">
              {savedConfig ? 'Go to Dashboard →' : 'Get Started →'}
            </button>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-8 border shadow-lg">
              <h2 className="text-3xl font-bold text-[#0f172a] mb-6">Configuration</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-semibold mb-2">Claude API Key</label><input type="password" value={config.anthropicKey} onChange={(e) => setConfig({...config, anthropicKey: e.target.value})} placeholder="sk-ant-..." className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                
                <div><label className="block text-sm font-semibold mb-2">Brave Search API Key</label><input type="password" value={config.braveKey} onChange={(e) => setConfig({...config, braveKey: e.target.value})} placeholder="BSA..." className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                
                <div><label className="block text-sm font-semibold mb-2">Webflow API Token</label><input type="password" value={config.webflowKey} onChange={(e) => setConfig({...config, webflowKey: e.target.value})} placeholder="Token" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                <div><label className="block text-sm font-semibold mb-2">Collection ID</label><input type="text" value={config.collectionId} onChange={(e) => setConfig({...config, collectionId: e.target.value})} placeholder="From Webflow CMS" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" /></div>
                <button onClick={saveConfig} disabled={loading} className="w-full bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50">{loading ? 'Saving...' : 'Save & Continue'}</button>
              </div>
              {status.message && <div className={`mt-4 p-4 rounded-lg ${status.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}><p className="text-sm">{status.message}</p></div>}
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-[#0f172a]">Your Blog Posts</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => { console.log('GSC button clicked'); setShowGscModal(true); }} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  {gscData ? `GSC: ${gscData.blogsCount || gscData.totalMatches} blogs` : 'Upload GSC Data'}
                </button>
                <button onClick={testWebflowConnection} disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 text-sm">
                  <Zap className="w-4 h-4" />
                  Test Connection
                </button>
                <button onClick={fetchBlogsQuick} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 text-sm">
                  ⚡ Quick Load (10)
                </button>
                <button onClick={() => fetchBlogs(true)} disabled={loading} className="bg-white text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border hover:bg-gray-50">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Load All</span>
                  {cacheTimestamp && !loading && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({Math.round((Date.now() - cacheTimestamp) / 60000)}m ago)
                    </span>
                  )}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12"><Loader className="w-12 h-12 text-[#0ea5e9] animate-spin mx-auto mb-4" /><p className="text-gray-600">Loading...</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <div key={blog.id} className="bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
                    <h3 className="font-semibold text-[#0f172a] mb-2 line-clamp-2">{blog.fieldData.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{blog.fieldData['post-summary'] || 'No description'}</p>
                    
                    {/* GSC Data Display */}
                    {(() => {
                      const gscInfo = getGscKeywordsForBlog(blog);
                      if (!gscInfo) return null;
                      
                      return (
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs bg-purple-50 border border-purple-200 rounded px-3 py-2">
                            <TrendingUp className="w-3 h-3 text-purple-600" />
                            <span className="text-purple-700 font-semibold">
                              {Math.round(gscInfo.clicks)} clicks • Pos {gscInfo.position.toFixed(1)}
                            </span>
                          </div>
                          {gscInfo.hasKeywords && gscInfo.keywords.length > 0 && (
                            <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
                              <span className="font-semibold text-gray-700">🎯 Keywords: </span>
                              {gscInfo.keywords.slice(0, 3).map(k => k.query).join(', ')}
                              {gscInfo.keywords.length > 3 && ` +${gscInfo.keywords.length - 3} more`}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-[#0ea5e9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0284c7] disabled:opacity-50">{loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '⚡ Smart Check'}</button>
                  </div>
                ))}
              </div>
            )}
            {status.message && (
              <div className={`mt-6 p-4 rounded-lg flex items-start gap-2 ${status.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex-1">
                  {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 inline mr-2" />}
                  {status.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 inline mr-2" />}
                  {status.type === 'info' && <Loader className="w-5 h-5 text-blue-600 animate-spin inline mr-2" />}
                  <span className={`text-sm ${status.type === 'error' ? 'text-red-800' : status.type === 'success' ? 'text-green-800' : 'text-blue-800'}`}>{status.message}</span>
                  
                  {status.type === 'error' && status.message.includes('timed out') && (
                    <div className="mt-3 p-3 bg-white border border-red-200 rounded">
                      <p className="text-xs font-semibold text-red-900 mb-2">🔧 Troubleshooting:</p>
                      <ul className="text-xs text-red-800 space-y-1">
                        <li>• Click "Test Connection" to diagnose the issue</li>
                        <li>• Try "Quick Load (10)" for faster access</li>
                        <li>• Check Webflow API status: <a href="https://status.webflow.com" target="_blank" className="underline text-blue-600">status.webflow.com</a></li>
                        <li>• Verify your Webflow token in Settings</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'review' && result && (
          <div className="space-y-6">
            {/* Title and Meta Description Editor */}
            <div className="bg-white rounded-xl p-6 border shadow-lg">
              <h3 className="text-xl font-bold text-[#0f172a] mb-4">📋 SEO Metadata</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={blogTitle} 
                    onChange={(e) => setBlogTitle(e.target.value)}
                    className="w-full bg-gray-50 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                    placeholder="Blog post title"
                  />
                  <p className="text-xs text-gray-500 mt-1">{blogTitle.length} characters</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Meta Description</label>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Field: {metaFieldName}
                    </span>
                  </div>
                  <textarea 
                    value={metaDescription} 
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="w-full bg-gray-50 border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] resize-none"
                    rows="3"
                    placeholder="Brief description for search engines"
                  />
                  <p className="text-xs text-gray-500 mt-1">{metaDescription.length} characters</p>
                  {!metaDescription && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800 font-semibold mb-1">⚠️ No meta description found</p>
                      <p className="text-xs text-yellow-700 mb-2">
                        The field "<strong>{metaFieldName}</strong>" is empty in Webflow. 
                        Open browser console (F12) to see all available fields or add a description manually here.
                      </p>
                      <button 
                        onClick={() => {
                          console.log('=== MANUAL FIELD CHECK ===');
                          console.log('Available fields:', Object.keys(selectedBlog.fieldData));
                          console.log('Current field being used:', metaFieldName);
                          console.log('All field values:');
                          Object.entries(selectedBlog.fieldData).forEach(([key, value]) => {
                            if (typeof value === 'string') {
                              console.log(`  ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
                            }
                          });
                          alert('Check browser console (F12) for field details');
                        }}
                        className="text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                      >
                        📋 Show All Fields in Console
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[#0f172a]">📄 Content Editor</h3>
                {/* COPY HTML BUTTON - ALWAYS VISIBLE AT TOP */}
                <button 
                  onClick={copyHTMLToClipboard}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 text-sm font-semibold"
                  title="Copy HTML for n8n workflow"
                >
                  <Copy className="w-4 h-4" />
                  Copy HTML
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex-1 mr-3">
                    <p className="text-blue-800 text-sm">✨ <span className="font-semibold">Edit directly!</span> {showHighlights && highlightedData?.changesCount > 0 && <span>• <span className="font-semibold">{highlightedData?.changesCount} real content {highlightedData?.changesCount === 1 ? 'change' : 'changes'}</span> highlighted</span>}</p>
                  </div>
                  <button onClick={() => setShowHighlights(!showHighlights)} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${showHighlights ? 'bg-blue-500 text-white' : 'bg-white border'}`}>{showHighlights ? '✨ Hide' : '👁️ Show'}</button>
                </div>
                
                <div className="bg-white rounded-xl p-6 border-2 border-[#0ea5e9] shadow-lg">
                  <style>{`
                    .blog-content h1 {
                      font-size: 2.25rem !important;
                      line-height: 2.5rem !important;
                      font-weight: 700 !important;
                      margin: 2rem 0 1rem 0 !important;
                      color: #0f172a !important;
                    }
                    .blog-content h2 {
                      font-size: 1.875rem !important;
                      line-height: 2.25rem !important;
                      font-weight: 700 !important;
                      margin: 1.75rem 0 1rem 0 !important;
                      color: #0f172a !important;
                    }
                    .blog-content h3 {
                      font-size: 1.5rem !important;
                      line-height: 2rem !important;
                      font-weight: 600 !important;
                      margin: 1.5rem 0 0.75rem 0 !important;
                      color: #1e293b !important;
                    }
                    .blog-content h4 {
                      font-size: 1.25rem !important;
                      line-height: 1.75rem !important;
                      font-weight: 600 !important;
                      margin: 1.25rem 0 0.5rem 0 !important;
                      color: #1e293b !important;
                    }
                    .blog-content img {
                      max-width: 100%;
                      height: auto;
                      display: block;
                      margin: 1rem 0;
                      cursor: pointer;
                    }
                    .blog-content iframe {
                      max-width: 100%;
                      width: 100%;
                      min-height: 400px;
                      margin: 1.5rem 0;
                      border: 1px solid #e5e7eb;
                      border-radius: 8px;
                    }
                    .blog-content embed,
                    .blog-content object {
                      max-width: 100%;
                      margin: 1.5rem 0;
                    }
                    .blog-content script {
                      display: block;
                    }
                    /* Override hidden class for widget content */
                    .blog-content .info-widget .hidden,
                    .blog-content [class*="widget"] .hidden,
                    .blog-content [class*="-widget"] .hidden,
                    .blog-content [class*="w-embed"] .hidden,
                    .blog-content [class*="w-widget"] .hidden {
                      display: block !important;
                      visibility: visible !important;
                    }
                    /* Generic styling for ALL widget types */
                    .blog-content [class*="-widget"],
                    .blog-content [class*="widget-"] {
margin: 1.5rem 0;
padding: 1.5rem;
border-radius: 6px;
}
/* Style info-widget boxes (purple/indigo) /
.blog-content .info-widget,
.blog-content [class="info-widget"] {
background-color: #f5f3ff;
border-left: 4px solid #8b5cf6;
}
/* Style warning/caution widgets (yellow/orange) /
.blog-content .warning-widget,
.blog-content .caution-widget,
.blog-content [class="warning-widget"],
.blog-content [class*="caution-widget"] {
background-color: #fef3c7;
border-left: 4px solid #f59e0b;
}
/* Style success/tip widgets (green) /
.blog-content .success-widget,
.blog-content .tip-widget,
.blog-content [class="success-widget"],
.blog-content [class*="tip-widget"] {
background-color: #d1fae5;
border-left: 4px solid #10b981;
}
/* Style error/danger widgets (red) /
.blog-content .error-widget,
.blog-content .danger-widget,
.blog-content [class="error-widget"],
.blog-content [class*="danger-widget"] {
background-color: #fee2e2;
border-left: 4px solid #ef4444;
}
/* Generic widget heading styles /
.blog-content [class="widget-heading"],
.blog-content [class*="-widget-heading"] {
font-size: 1.125rem;
font-weight: 600;
margin: 0 0 0.75rem 0;
}
.blog-content .info-widget [class*="heading"] {
color: #8b5cf6;
}
.blog-content .warning-widget [class*="heading"],
.blog-content .caution-widget [class*="heading"] {
color: #f59e0b;
}
.blog-content .success-widget [class*="heading"],
.blog-content .tip-widget [class*="heading"] {
color: #10b981;
}
.blog-content .error-widget [class*="heading"],
.blog-content .danger-widget [class*="heading"] {
color: #ef4444;
}
/* Generic widget content styles /
.blog-content [class="widget-content"],
.blog-content [class*="-widget-content"] {
color: #1e293b;
line-height: 1.7;
}
.blog-content [class*="widget-content"] p,
.blog-content [class*="-widget-content"] p {
margin: 0;
}
/* Widget type labels /
.blog-content .widget-type,
.blog-content [class="widget-type"] {
display: inline-block;
font-size: 0.875rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
margin-bottom: 0.5rem;
}
.blog-content .info-widget .widget-type {
color: #8b5cf6;
}
.blog-content .warning-widget .widget-type,
.blog-content .caution-widget .widget-type {
color: #f59e0b;
}
.blog-content .success-widget .widget-type,
.blog-content .tip-widget .widget-type {
color: #10b981;
}
.blog-content .error-widget .widget-type,
.blog-content .danger-widget .widget-type {
color: #ef4444;
}
.blog-content [class*="widget"],
.blog-content [class*="w-embed"],
.blog-content [class*="w-widget"],
.blog-content [data-w-id],
.blog-content [data-widget] {
margin: 1.5rem 0;
max-width: 100%;
}
.blog-content table {
width: 100%;
border-collapse: collapse;
margin: 1.5rem 0;
border: 1px solid #e5e7eb;
}
.blog-content th {
background-color: #f3f4f6;
padding: 0.75rem;
border: 1px solid #e5e7eb;
font-weight: 600;
}
.blog-content td {
padding: 0.75rem;
border: 1px solid #e5e7eb;
}
.blog-content p {
margin: 0.75rem 0;
line-height: 1.7;
}
.blog-content ul, .blog-content ol {
margin: 1rem 0;
padding-left: 2rem;
}
.blog-content ul {
list-style-type: disc;
}
.blog-content ol {
list-style-type: decimal;
}
.blog-content li {
margin: 0.5rem 0;
line-height: 1.7;
display: list-item;
}
.blog-content a {
color: #0ea5e9;
text-decoration: underline;
cursor: pointer;
pointer-events: auto;
position: relative;
}
.blog-content a:hover {
color: #0284c7;
text-decoration: underline;
background-color: rgba(14, 165, 233, 0.1);
}
.blog-content a::after {
content: "✏️";
font-size: 0.7em;
margin-left: 4px;
opacity: 0;
transition: opacity 0.2s;
}
.blog-content a:hover::after {
opacity: 0.6;
}
`}</style>
<div className="text-[#0ea5e9] text-sm font-bold mb-2">📝 EDITABLE CONTENT</div>
<div className="flex items-center justify-between mb-3">
<div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg flex-wrap flex-1">
<button onClick={() => formatText('bold')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 font-bold text-sm" title="Bold">B</button>
<button onClick={() => formatText('italic')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 italic text-sm" title="Italic">I</button>
<div className="w-px h-6 bg-gray-300"></div>
<button onClick={() => formatHeading(1)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm font-bold" title="Heading 1">H1</button>
<button onClick={() => formatHeading(2)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm font-bold" title="Heading 2">H2</button>
<button onClick={() => formatHeading(3)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Heading 3">H3</button>
<button onClick={() => formatHeading(4)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Heading 4">H4</button>
<div className="w-px h-6 bg-gray-300"></div>
<button onClick={() => formatList('bullet')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Bullet List">• List</button>
<button onClick={() => formatList('numbered')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Numbered List">1. List</button>
<div className="w-px h-6 bg-gray-300"></div>
<button onClick={insertLink} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Add Link">🔗</button>
<button onClick={insertImage} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Add Image">🖼️</button>
</div>
<div className="ml-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 whitespace-nowrap">
💡 Click links to edit • Ctrl+Click to open
</div>
</div>
<div ref={afterViewRef} className="blog-content text-gray-800 overflow-y-auto bg-white rounded-lg p-6 min-h-[600px]" contentEditable={true} suppressContentEditableWarning={true} onInput={handleAfterViewInput} onClick={handleContentClick} style={{ maxHeight: '800px', outline: 'none', cursor: 'text' }} />
</div>
</div>
</div>
        <div className="flex gap-4">
          <button onClick={() => setView('dashboard')} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-200">← Cancel</button>
          <button onClick={publishToWebflow} disabled={loading} className="flex-1 bg-[#0ea5e9] text-white py-4 px-8 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">{loading ? <><Loader className="w-5 h-5 animate-spin" />{status.message.includes('Retry') ? status.message : 'Publishing...'}</> : <><CheckCircle className="w-5 h-5" />Publish to Webflow</>}</button>
        </div>
        
        {/* Error/Status Display */}
        {status.message && status.type === 'error' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-red-900 mb-2">Publishing Failed</h4>
                <p className="text-red-800 text-sm mb-3">{status.message}</p>
                <div className="bg-white border border-red-200 rounded-lg p-4 mb-3">
                  <p className="font-semibold text-red-900 mb-2">💡 Backup Option:</p>
                  <p className="text-red-700 text-sm mb-3">
                    If publishing keeps failing, you can use the "Copy HTML" button at the top to copy the HTML and publish via your n8n workflow.
                  </p>
                </div>
                <button 
                  onClick={publishToWebflow} 
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {view === 'success' && (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-12 h-12 text-green-600" /></div>
        <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Published!</h2>
        <p className="text-gray-600 mb-8">Content updated on Webflow</p>
        <button onClick={() => { setView('dashboard'); setResult(null); setSelectedBlog(null); }} className="bg-[#0ea5e9] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg">← Back</button>
      </div>
    )}
  </div>

  {imageAltModal.show && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">Edit Image</h3>
        <img src={imageAltModal.src} alt={imageAltModal.currentAlt} className="max-w-full h-auto rounded mb-4" style={{ maxHeight: '300px' }} />
        <label className="block text-sm font-semibold mb-2">Alt Text</label>
        <textarea value={imageAltModal.currentAlt} onChange={(e) => setImageAltModal({ ...imageAltModal, currentAlt: e.target.value })} className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] resize-none" rows="3" />
        <div className="flex gap-3 mt-4">
          <button onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })} className="flex-1 bg-gray-100 py-3 rounded font-semibold">Cancel</button>
          <button onClick={deleteImage} className="flex-1 bg-red-500 text-white py-3 rounded font-semibold">Delete</button>
          <button onClick={updateImageAlt} className="flex-1 bg-[#0ea5e9] text-white py-3 rounded font-semibold">Save</button>
        </div>
      </div>
    </div>
  )}

  {showLinkModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{editingLink ? '✏️ Edit Link' : '🔗 Add Link'}</h3>
        <label className="block text-sm font-semibold mb-2">Link Text</label>
        <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Click here" className="w-full bg-gray-50 border rounded px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" />
        <label className="block text-sm font-semibold mb-2">URL</label>
        <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" autoFocus onKeyPress={(e) => e.key === 'Enter' && applyLink()} />
        <div className="flex gap-3 mt-4">
          <button onClick={() => { setShowLinkModal(false); setLinkUrl(''); setLinkText(''); setEditingLink(null); }} className="flex-1 bg-gray-100 py-3 rounded font-semibold">Cancel</button>
          {editingLink && <button onClick={() => { if (editingLink) { editingLink.parentNode.replaceChild(document.createTextNode(editingLink.textContent), editingLink); if (afterViewRef.current) setEditedContent(afterViewRef.current.innerHTML); } setShowLinkModal(false); setLinkUrl(''); setLinkText(''); setEditingLink(null); }} className="flex-1 bg-red-500 text-white py-3 rounded font-semibold">Remove</button>}
          <button onClick={applyLink} className="flex-1 bg-[#0ea5e9] text-white py-3 rounded font-semibold">{editingLink ? 'Update' : 'Add'}</button>
        </div>
      </div>
    </div>
  )}

  {showImageModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">🖼️ Add Image</h3>
        <label className="block text-sm font-semibold mb-2">Upload</label>
        <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setImageFile(file); setImageUrl(''); } }} className="w-full bg-gray-50 border rounded px-4 py-3 mb-4" />
        {imageFile && <p className="text-xs text-green-700 mb-4">✓ {imageFile.name}</p>}
        <div className="flex items-center gap-3 mb-4"><div className="flex-1 border-t"></div><span className="text-sm text-gray-500 font-semibold">OR</span><div className="flex-1 border-t"></div></div>
        <label className="block text-sm font-semibold mb-2">URL</label>
        <input type="url" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); }} placeholder="https://example.com/image.jpg" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" onKeyPress={(e) => e.key === 'Enter' && applyImage()} />
        <div className="flex gap-3 mt-4">
          <button onClick={() => { setShowImageModal(false); setImageUrl(''); setImageFile(null); }} className="flex-1 bg-gray-100 py-3 rounded font-semibold">Cancel</button>
          <button onClick={applyImage} className="flex-1 bg-[#0ea5e9] text-white py-3 rounded font-semibold">Insert</button>
        </div>
      </div>
    </div>
  )}

  {showKeywordPopup && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowKeywordPopup(false)}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">🎯 Optimize with Keywords</h3>
        
        {matchedKeywords.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Auto-matched keywords for this blog:</p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {matchedKeywords.slice(0, 10).map((kw, idx) => (
                <div key={idx} className="text-xs flex items-center justify-between">
                  <span className="text-purple-800">
                    <span className="font-semibold">{idx + 1}.</span> {kw.query}
                  </span>
                  <span className="text-purple-600 text-xs">
                    Pos {kw.position.toFixed(1)} • {Math.round(kw.clicks)} clicks
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Add custom keywords (optional):
          </label>
          <textarea
            value={customKeywords}
            onChange={(e) => setCustomKeywords(e.target.value)}
            placeholder="Enter additional keywords (one per line)&#10;Example:&#10;linkedin automation tool&#10;sales robot pricing"
            className="w-full h-24 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            These will be added to the auto-matched keywords above
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowKeywordPopup(false);
              // Continue without keywords
              const analyze = async () => {
                setLoading(true);
                setView('review');
                const blog = selectedBlog;
                const fullOriginalContent = blog.fieldData['post-body'] || blog.fieldData['blog-content'] || '';
                
                try {
                  const response = await fetch(`${BACKEND_URL}/api/analyze`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      blogContent: fullOriginalContent,
                      title: blogTitle,
                      anthropicKey: config.anthropicKey,
                      braveKey: config.braveKey,
                      researchPrompt: selectedResearchPrompt,
                      writingPrompt: WRITING_PROMPT
                    })
                  });
                  
                  const data = await response.json();
                  if (data.error) throw new Error(data.error);
                  
                  setOriginalContent(fullOriginalContent);
                  setEditedContent(data.content);
                  setResult(data);
                  
                  const highlighted = createHighlightedHTML(fullOriginalContent, data.content);
                  setHighlightedData(highlighted);
                  
                  setStatus({ type: 'success', message: data.message || 'Analysis complete!' });
                  setLoading(false);
                } catch (error) {
                  setStatus({ type: 'error', message: error.message });
                  setLoading(false);
                  setView('dashboard');
                }
              };
              analyze();
            }}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200"
          >
            Skip Keywords
          </button>
          
          <button
            onClick={() => {
              // Combine matched + custom keywords
              const matched = matchedKeywords.map(k => ({
                query: k.query,
                position: k.position,
                clicks: k.clicks,
                impressions: k.impressions,
                ctr: k.ctr
              }));
              const custom = customKeywords.split('\n').filter(k => k.trim()).map(k => ({
                query: k.trim(),
                position: 50,
                clicks: 0,
                impressions: 0,
                ctr: 0
              }));
              const allKeywords = [...matched, ...custom].filter((k, i, arr) => arr.findIndex(x => x.query === k.query) === i);
              
              console.log('Optimizing with keywords:', allKeywords);
              continueAnalyzeWithKeywords(allKeywords);
            }}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
          >
            Optimize with {matchedKeywords.length + (customKeywords.split('\n').filter(k => k.trim()).length)} Keywords
          </button>
        </div>
      </div>
    </div>
  )}

  {showGscModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={() => setShowGscModal(false)}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">📊 Upload GSC Data</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload your Google Search Console XLSX export to optimize your blogs for SEO.
        </p>
        
        <label className="block text-sm font-semibold mb-2">Choose XLSX File</label>
        <input 
          type="file" 
          accept=".xlsx,.xls" 
          onChange={handleGscUpload}
          disabled={gscUploading}
          className="w-full bg-gray-50 border rounded px-4 py-3 mb-4" 
        />
        
        {status.message && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            status.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {status.message}
          </div>
        )}
        
        {gscData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-green-800 font-semibold">✅ Current GSC Data:</p>
            <p className="text-xs text-green-700">
              {gscData.blogsCount} blogs with keyword data
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowGscModal(false)} 
            disabled={gscUploading}
            className="flex-1 bg-gray-100 py-3 rounded font-semibold"
          >
            {gscData ? 'Done' : 'Cancel'}
          </button>
          {gscData && (
            <button 
              onClick={() => {
                localStorage.removeItem('contentops_gsc_data');
                setGscData(null);
                setStatus({ type: 'success', message: 'GSC data cleared' });
                setShowGscModal(false);
              }}
              className="flex-1 bg-red-500 text-white py-3 rounded font-semibold"
            >
              Clear Data
            </button>
          )}
        </div>
      </div>
    </div>
  )}

  <footer className="bg-[#0f172a] text-white mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold">ContentOps</div>
            <div className="text-gray-400 text-xs">by SalesRobot</div>
          </div>
        </div>
        <div className="text-center md:text-right">
          <p className="text-gray-400 text-sm">© 2025 ContentOps. All rights reserved.</p>
          <p className="text-gray-500 text-xs mt-1">Powered by Brave Search + Claude AI</p>
        </div>
      </div>
    </div>
  </footer>
</div>
);
}
