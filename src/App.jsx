import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye } from 'lucide-react';

const BACKEND_URL = 'https://contentops-backend-production.up.railway.app';

const RESEARCH_PROMPT = `You are a professional fact-checker and researcher. Your job is to:

1. Verify ALL claims in the content: pricing, features, stats, company info, technical specs
2. Use Brave Search strategically: official websites first, 2-3 searches per topic, recent info (2024-2025)
3. Focus on LinkedIn/SalesRobot specifics:
   - SalesRobot total users: 4200+
   - LinkedIn daily limits: 75 connection requests per day (NOT 100/week)
   - InMails: 40 per day to open profiles without credits
   - SalesRobot pricing: Basic $59/mo, Advanced $79/mo, Pro $99/mo
   - AI features: AI Voice Clone, AI Appointment Setter (NOT "AI Inbox Manager"), SalesGPT, Smart Reply Detection
4. Check for missing AI/NEW features in competitor comparisons
5. Return structured findings with factChecks and missingFeatures arrays

Be thorough but concise. Focus on accuracy.`;

const WRITING_PROMPT = `You are an expert blog rewriter focused on clarity, accuracy, and engagement.

**CRITICAL WRITING RULES:**
NEVER USE: Em-dashes, banned words (transform, delve, unleash, revolutionize, meticulous, navigating, realm, bespoke, tailored, autopilot, magic), sentences over 30 words, markdown syntax
ALWAYS USE: Contractions, active voice, short sentences (15-20 words), direct address, HTML bold tags (<strong> or <b>), proper HTML formatting

**FORMATTING REQUIREMENTS:**
- Use <strong>text</strong> or <b>text</b> for bold (NEVER use **text** markdown syntax)
- Use <em>text</em> or <i>text</i> for italics (NEVER use *text* or _text_)
- All formatting must be valid HTML, no markdown

**CRITICAL: PRESERVE ALL SPECIAL ELEMENTS - DO NOT CONVERT TO TEXT**
- Keep ALL <figure> tags with their exact styling and classes
- Keep ALL <img> tags with their src URLs unchanged
- Keep ALL <div> wrappers around images
- Keep ALL <table>, <thead>, <tbody>, <tr>, <td>, <th> tags with all attributes and classes
- NEVER convert tables to plain text lists or descriptions - keep the exact HTML table structure
- Keep ALL <iframe>, <script>, <embed> tags (widgets, embeds, calculators, forms)
- Keep ALL custom Webflow elements (w-richtext-, w-embed-, w-widget-, etc.)
- Keep ALL data attributes (data-*, w-*, webflow-*)
- Do NOT remove, modify, simplify, or relocate any images, tables, widgets, or embeds
- All special elements should stay in their original positions in the content

**EXAMPLES OF WHAT NOT TO DO:**
❌ BAD: Converting <table><tr><td>Feature</td><td>Price</td></tr></table> to "Feature: Price"
❌ BAD: Converting comparison tables to bullet point lists
❌ BAD: Describing table contents instead of preserving the HTML
✅ GOOD: Keep the exact <table> HTML structure with all rows and columns

**SALESROBOT SPECIFIC UPDATES - MUST APPLY:**
1. User count: Always use "4200+" users (not 4000, 3000, etc.)
2. LinkedIn limits: "75 connection requests per day" (not 100/week, not other numbers)
3. InMail limits: "40 InMails per day to open profiles without credits"
4. AI naming: Replace "AI Inbox Manager" with "AI Appointment Setter"
5. Tagline: Use "Message 100s of people on LinkedIn and cold email. Every Week. Automatically." (not "send 200+ messages" or similar)
6. Compliance: Always mention "SalesRobot fully complies with LinkedIn limits"

**YOUR REWRITING PROCESS:**
1. Fix factual errors found by research: Update pricing accurately, correct feature descriptions, fix stats
2. Add missing AI features (HIGH PRIORITY): AI Voice Clone, AI Appointment Setter, SalesGPT, Smart Reply Detection, AI Comment Automation
3. Fix grammar: Remove em-dashes, eliminate banned words, shorten 30+ word sentences, add contractions, use active voice
4. Preserve structure: Keep original HTML formatting, maintain headings/lists, keep images/links/tables/widgets, preserve ALL <figure>, <img>, <table>, <iframe>, <script>, and <embed> tags with all their attributes
5. Add TL;DR if missing at the very start: 3-4 sentences covering main points

**CRITICAL: Return the COMPLETE HTML content including ALL images, tables (as HTML tables, not text), widgets, and embeds. Do not truncate, simplify, or summarize. Return every single paragraph, heading, image, table row, widget, and section from the original with your edits applied. Use only HTML tags, never markdown syntax. Never convert structured HTML elements like tables into plain text descriptions.**

Return only the complete rewritten HTML content with all images, tables, and widgets preserved exactly as HTML.`;

const createHighlightedHTML = (originalHTML, updatedHTML) => {
  const stripHTML = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  // Split by major blocks and preserve structure
  const blockRegex = /<(?:p|h[1-6]|li|ul|ol|figure|div|a|section|article|blockquote|table)[^>]*>.*?<\/(?:p|h[1-6]|li|ul|ol|figure|div|a|section|article|blockquote|table)>|<img[^>]*\/?>/gis;
  
  const originalBlocks = originalHTML.match(blockRegex) || [];
  const updatedBlocks = updatedHTML.match(blockRegex) || [];
  
  const originalMap = new Map();
  originalBlocks.forEach((block, idx) => {
    const cleaned = stripHTML(block);
    if (cleaned) {
      originalMap.set(cleaned, { html: block, index: idx });
    }
  });
  
  let highlightedHTML = '';
  let changesCount = 0;
  
  updatedBlocks.forEach((updatedBlock) => {
    const cleanedUpdated = stripHTML(updatedBlock);
    const match = originalMap.get(cleanedUpdated);
    
    // Only highlight if:
    // 1. Block is substantial (more than 20 chars of text)
    // 2. Block doesn't exist in original
    // 3. Block is not a table, widget, or image (preserve those without highlighting)
    const isSpecialElement = updatedBlock.match(/<(table|iframe|embed|script|img|figure)/i);
    
    if (!match && cleanedUpdated.length > 20 && !isSpecialElement) {
      // Changed section - subtle blue highlight
      const highlighted = updatedBlock.replace(
        /^(<[^>]+>)/,
        `$1<span style="background-color: #e0f2fe; display: block; padding: 8px; margin: -8px; border-left: 3px solid #0ea5e9;">`
      ).replace(/(<\/[^>]+>)$/, `</span>$1`);
      highlightedHTML += highlighted;
      changesCount++;
    } else {
      highlightedHTML += updatedBlock;
    }
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
    
    // Register image formats to preserve src and alt attributes
    const BlockEmbed = Quill.import('blots/block/embed');
    class ImageBlot extends BlockEmbed {
      static create(value) {
        let node = super.create();
        node.setAttribute('src', value.src || value);
        if (value.alt) {
          node.setAttribute('alt', value.alt);
        }
        node.setAttribute('style', 'max-width: 100%; height: auto;');
        return node;
      }

      static value(node) {
        return {
          src: node.getAttribute('src'),
          alt: node.getAttribute('alt')
        };
      }
    }
    ImageBlot.blotName = 'image';
    ImageBlot.tagName = 'img';
    Quill.register(ImageBlot);

    quillRef.current = new Quill(editorRef.current, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });

    // Set initial content
    const delta = quillRef.current.clipboard.convert(content);
    quillRef.current.setContents(delta, 'silent');

    quillRef.current.on('text-change', () => {
      const html = quillRef.current.root.innerHTML;
      onChange(html);
    });
  };

  useEffect(() => {
    if (quillRef.current && content !== quillRef.current.root.innerHTML) {
      const cursorPosition = quillRef.current.getSelection();
      const delta = quillRef.current.clipboard.convert(content);
      quillRef.current.setContents(delta, 'silent');
      if (cursorPosition) {
        try {
          quillRef.current.setSelection(cursorPosition);
        } catch (e) {
          // Ignore cursor position errors
        }
      }
    }
  }, [content]);

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200">
      <style>{`
        .ql-editor img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem 0;
        }
        .ql-editor h1 {
          font-size: 2.25rem;
          line-height: 2.5rem;
          font-weight: 700;
          margin: 2rem 0 1rem 0;
          color: #0f172a;
        }
        .ql-editor h2 {
          font-size: 1.875rem;
          line-height: 2.25rem;
          font-weight: 700;
          margin: 1.75rem 0 1rem 0;
          color: #0f172a;
        }
        .ql-editor h3 {
          font-size: 1.5rem;
          line-height: 2rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem 0;
          color: #1e293b;
        }
        .ql-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
        }
        .ql-editor th {
          background-color: #f3f4f6;
          font-weight: 600;
          text-align: left;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
        }
        .ql-editor td {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
        }
        .ql-editor tbody tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .ql-editor iframe, .ql-editor embed {
          max-width: 100%;
          margin: 1.5rem 0;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }
      `}</style>
      <div ref={editorRef} style={{ minHeight: '600px' }} />
    </div>
  );
}

export default function ContentOps() {
  const [view, setView] = useState('home');
  const [config, setConfig] = useState({ anthropicKey: '', braveKey: '', webflowKey: '', collectionId: '' });
  const [savedConfig, setSavedConfig] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);
  const [viewMode, setViewMode] = useState('changes');
  const [editMode, setEditMode] = useState('visual');
  const [editedContent, setEditedContent] = useState('');
  const [highlightedData, setHighlightedData] = useState(null);
  const [imageAltModal, setImageAltModal] = useState({ show: false, src: '', currentAlt: '', index: -1 });
  const [showHighlights, setShowHighlights] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }
  }, []);

  // Update highlighted diff whenever edited content changes
  useEffect(() => {
    if (result && editedContent && result.originalContent) {
      const highlighted = createHighlightedHTML(result.originalContent, editedContent);
      setHighlightedData(highlighted);
    }
  }, [editedContent, result]);

  const handleImageClick = (e) => {
    if (e.target.tagName === 'IMG') {
      const src = e.target.src;
      const alt = e.target.alt || '';
      const allImages = editedContent.match(/<img[^>]*>/g) || [];
      const imgIndex = Array.from(e.currentTarget.querySelectorAll('img')).indexOf(e.target);
      setImageAltModal({ show: true, src, currentAlt: alt, index: imgIndex });
    }
  };

  const updateImageAlt = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent, 'text/html');
    const images = doc.querySelectorAll('img');
    
    if (images[imageAltModal.index]) {
      images[imageAltModal.index].setAttribute('alt', imageAltModal.currentAlt);
      setEditedContent(doc.body.innerHTML);
    }
    
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  const saveConfig = () => {
    if (!config.anthropicKey || !config.braveKey || !config.webflowKey || !config.collectionId) {
      setStatus({ type: 'error', message: 'Please fill in all fields' });
      return;
    }
    localStorage.setItem('contentops_config', JSON.stringify(config));
    setSavedConfig(config);
    setStatus({ type: 'success', message: 'Configuration saved!' });
    fetchBlogs();
  };

  const fetchBlogs = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Fetching blogs...' });
    try {
      const response = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}`, {
        headers: { 'Authorization': `Bearer ${config.webflowKey}`, 'accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch blogs');
      const data = await response.json();
      setBlogs(data.items || []);
      setStatus({ type: 'success', message: `Found ${data.items?.length || 0} blog posts` });
      setView('dashboard');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const analyzeBlog = async (blog) => {
    setSelectedBlog(blog);
    setLoading(true);
    setStatus({ type: 'info', message: 'Smart analysis in progress (15-20s)...' });
    
    // Debug: Log all available fields to find images
    console.log('📊 Blog fieldData keys:', Object.keys(blog.fieldData));
    console.log('📊 Full blog object:', blog);
    
    const fullOriginalContent = blog.fieldData['post-body'] || '';
    const originalCharCount = fullOriginalContent.length;
    
    // Count images in original content
    const originalImageCount = (fullOriginalContent.match(/<img/g) || []).length;
    const originalFigureCount = (fullOriginalContent.match(/<figure/g) || []).length;
    const originalTableCount = (fullOriginalContent.match(/<table/g) || []).length;
    const originalIframeCount = (fullOriginalContent.match(/<iframe/g) || []).length;
    const originalEmbedCount = (fullOriginalContent.match(/<embed/g) || []).length;
    const originalScriptCount = (fullOriginalContent.match(/<script/g) || []).length;
    const originalWidgetCount = (fullOriginalContent.match(/class="[^"]*w-embed[^"]*"/g) || []).length +
                                 (fullOriginalContent.match(/class="[^"]*w-widget[^"]*"/g) || []).length;
    
    console.log('📝 Post body length:', originalCharCount);
    console.log('🖼️ Original images found:', originalImageCount);
    console.log('🖼️ Original figures found:', originalFigureCount);
    console.log('📊 Original tables found:', originalTableCount);
    console.log('🎬 Original iframes found:', originalIframeCount);
    console.log('📦 Original embeds found:', originalEmbedCount);
    console.log('🔌 Original widgets found:', originalWidgetCount);
    console.log('⚙️ Original scripts found:', originalScriptCount);
    console.log('🖼️ Looking for image fields...');
    Object.keys(blog.fieldData).forEach(key => {
      if (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('picture')) {
        console.log(`   Found potential image field: ${key}`, blog.fieldData[key]);
      }
    });
    
    if (originalImageCount > 0) {
      console.log('✅ Images detected in original content!');
      // Log first image src for verification
      const imgMatch = fullOriginalContent.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        console.log('   First image URL:', imgMatch[1]);
      }
    } else {
      console.warn('⚠️ No images found in post-body field!');
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogContent: fullOriginalContent,
          title: blog.fieldData.name,
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          researchPrompt: RESEARCH_PROMPT,
          writingPrompt: WRITING_PROMPT
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      
      const data = await response.json();
      let updatedContent = data.content || fullOriginalContent;
      
      // Fix markdown-style bold to HTML bold tags
      updatedContent = updatedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Check if content has been converted to plain text (common issue)
      const hasHTMLTags = updatedContent.match(/<[a-z][\s\S]*>/i);
      if (!hasHTMLTags && fullOriginalContent.match(/<[a-z][\s\S]*>/i)) {
        console.error('❌ CRITICAL: Backend converted HTML to plain text!');
        setStatus({ 
          type: 'error', 
          message: '⚠️ Backend stripped all HTML tags. Using original content.' 
        });
        updatedContent = fullOriginalContent;
      }
      
      const returnedCharCount = updatedContent.length;
      const truncationThreshold = 0.7;
      
      // Check if images survived the backend processing
      const returnedImageCount = (updatedContent.match(/<img/g) || []).length;
      const returnedFigureCount = (updatedContent.match(/<figure/g) || []).length;
      const returnedTableCount = (updatedContent.match(/<table/g) || []).length;
      const returnedIframeCount = (updatedContent.match(/<iframe/g) || []).length;
      const returnedEmbedCount = (updatedContent.match(/<embed/g) || []).length;
      const returnedScriptCount = (updatedContent.match(/<script/g) || []).length;
      const returnedWidgetCount = (updatedContent.match(/class="[^"]*w-embed[^"]*"/g) || []).length +
                                   (updatedContent.match(/class="[^"]*w-widget[^"]*"/g) || []).length;
      
      console.log('🔍 Backend response check:');
      console.log('   Original images:', originalImageCount, '| Returned images:', returnedImageCount);
      console.log('   Original figures:', originalFigureCount, '| Returned figures:', returnedFigureCount);
      console.log('   Original tables:', originalTableCount, '| Returned tables:', returnedTableCount);
      console.log('   Original iframes:', originalIframeCount, '| Returned iframes:', returnedIframeCount);
      console.log('   Original embeds:', originalEmbedCount, '| Returned embeds:', returnedEmbedCount);
      console.log('   Original widgets:', originalWidgetCount, '| Returned widgets:', returnedWidgetCount);
      console.log('   Original scripts:', originalScriptCount, '| Returned scripts:', returnedScriptCount);
      console.log('   Original chars:', originalCharCount, '| Returned chars:', returnedCharCount);
      
      let elementsLost = [];
      if (returnedImageCount < originalImageCount) {
        elementsLost.push(`${originalImageCount - returnedImageCount} images`);
      }
      if (returnedTableCount < originalTableCount) {
        elementsLost.push(`${originalTableCount - returnedTableCount} tables`);
      }
      if (returnedIframeCount < originalIframeCount) {
        elementsLost.push(`${originalIframeCount - returnedIframeCount} iframes`);
      }
      if (returnedEmbedCount < originalEmbedCount) {
        elementsLost.push(`${originalEmbedCount - returnedEmbedCount} embeds`);
      }
      if (returnedWidgetCount < originalWidgetCount) {
        elementsLost.push(`${originalWidgetCount - returnedWidgetCount} widgets`);
      }
      if (returnedScriptCount < originalScriptCount) {
        elementsLost.push(`${originalScriptCount - returnedScriptCount} scripts`);
      }
      
      if (elementsLost.length > 0) {
        console.error(`❌ ELEMENT LOSS! Backend lost: ${elementsLost.join(', ')}`);
        setStatus({ 
          type: 'error', 
          message: `⚠️ Backend lost ${elementsLost.join(', ')}. Using original content.` 
        });
        updatedContent = fullOriginalContent;
      }
      
      if (returnedCharCount < originalCharCount * truncationThreshold) {
        console.warn(`⚠️ Backend may have truncated content. Original: ${originalCharCount} chars, Returned: ${returnedCharCount} chars`);
        setStatus({ 
          type: 'error', 
          message: `⚠️ Backend returned incomplete content (${Math.round(returnedCharCount/originalCharCount*100)}% of original). Using original content. Check backend token limits.` 
        });
        updatedContent = fullOriginalContent;
      }
      
      console.log('🔗 Link check:');
      console.log('Original links:', (fullOriginalContent.match(/<a /g) || []).length);
      console.log('Updated links:', (updatedContent.match(/<a /g) || []).length);
      
      const highlighted = createHighlightedHTML(fullOriginalContent, updatedContent);
      setHighlightedData(highlighted);
      
      setResult({
        changes: data.changes || [],
        searchesUsed: data.searchesUsed || 0,
        claudeCalls: data.claudeCalls || 0,
        sectionsUpdated: data.sectionsUpdated || 0,
        content: updatedContent,
        originalContent: fullOriginalContent,
        duration: data.duration || 0
      });
      
      setEditedContent(updatedContent);
      setStatus({ 
        type: returnedCharCount < originalCharCount * truncationThreshold ? 'error' : 'success', 
        message: returnedCharCount < originalCharCount * truncationThreshold 
          ? `⚠️ Content truncated by backend. Using original. ${data.searchesUsed} searches, ${(data.duration/1000).toFixed(1)}s`
          : `✅ Complete! ${data.searchesUsed} searches, ${data.claudeCalls} rewrites, ${highlighted.changesCount} changes, ${(data.duration/1000).toFixed(1)}s` 
      });
      setView('review');
      setViewMode('changes');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishToWebflow = async () => {
    if (!result || !selectedBlog) return;
    setLoading(true);
    setStatus({ type: 'info', message: 'Publishing...' });
    try {
      const response = await fetch(`${BACKEND_URL}/api/webflow?collectionId=${config.collectionId}&itemId=${selectedBlog.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${config.webflowKey}`, 'Content-Type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({
          fieldData: {
            name: selectedBlog.fieldData.name,
            'post-body': editedContent,
            'post-summary': selectedBlog.fieldData['post-summary']
          }
        })
      });
      if (!response.ok) throw new Error('Failed to publish');
      setStatus({ type: 'success', message: '✅ Published successfully!' });
      setView('success');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SalesRobot-style navbar */}
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
              <p className="text-xl text-gray-600 mb-3">Pure Brave research • AI-powered rewrites • Full blog diff view</p>
              <p className="text-sm text-gray-500">15-20 second checks • Subtle blue highlights show changes</p>
            </div>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-[#0ea5e9] text-white px-10 py-4 rounded-lg text-lg font-bold hover:bg-[#0284c7] shadow-lg">
              {savedConfig ? 'Go to Dashboard →' : 'Get Started →'}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              {[
                { icon: <Search className="w-8 h-8" />, title: 'Pure Brave Research', desc: 'Stage 1: Direct Brave API searches (no Claude costs)' },
                { icon: <Zap className="w-8 h-8" />, title: 'Smart Rewrites', desc: 'Stage 2: Claude fixes errors, adds features, improves grammar' },
                { icon: <Eye className="w-8 h-8" />, title: 'Full Blog Diff', desc: 'See complete before/after with highlighted changes' }
              ].map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 bg-[#0ea5e9] bg-opacity-10 rounded-xl flex items-center justify-center mb-4 mx-auto text-[#0ea5e9]">{f.icon}</div>
                  <h3 className="text-lg font-bold text-[#0f172a] mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
              <h2 className="text-3xl font-bold text-[#0f172a] mb-6">Team Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Claude API Key</label>
                  <input type="password" value={config.anthropicKey} onChange={(e) => setConfig({...config, anthropicKey: e.target.value})} placeholder="sk-ant-..." className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">Used for Stage 2: Content rewriting only</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Brave Search API Key</label>
                  <input type="password" value={config.braveKey} onChange={(e) => setConfig({...config, braveKey: e.target.value})} placeholder="BSA..." className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent" />
                  <p className="text-xs text-gray-500 mt-1">Used for Stage 1: Pure research (2000 free/month)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Webflow API Token</label>
                  <input type="password" value={config.webflowKey} onChange={(e) => setConfig({...config, webflowKey: e.target.value})} placeholder="Your Webflow token" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Collection ID</label>
                  <input type="text" value={config.collectionId} onChange={(e) => setConfig({...config, collectionId: e.target.value})} placeholder="From Webflow CMS" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent" />
                </div>
                <button onClick={saveConfig} disabled={loading} className="w-full bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50 shadow-lg">
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
              {status.message && (
                <div className={`mt-4 p-4 rounded-lg ${status.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className={`text-sm ${status.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>{status.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[#0f172a]">Your Blog Posts</h2>
                <p className="text-gray-600 text-sm mt-1">Click to analyze: Brave Research → Claude Rewrite → Full Blog Diff</p>
              </div>
              <button onClick={fetchBlogs} disabled={loading} className="bg-white text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-300 hover:bg-gray-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 text-[#0ea5e9] animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <div key={blog.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                    <h3 className="font-semibold text-[#0f172a] mb-2 line-clamp-2">{blog.fieldData.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{blog.fieldData['post-summary'] || 'No description'}</p>
                    
                    {/* Debug: Show available fields */}
                    <details className="mb-3 text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-700">🔍 Debug: View fields</summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700 max-h-32 overflow-y-auto">
                        {Object.keys(blog.fieldData).map(key => (
                          <div key={key} className="flex gap-2">
                            <span className="font-mono font-semibold">{key}:</span>
                            <span className="truncate" title={String(blog.fieldData[key])}>
                              {typeof blog.fieldData[key] === 'string' 
                                ? blog.fieldData[key].substring(0, 50) + (blog.fieldData[key].length > 50 ? '...' : '')
                                : JSON.stringify(blog.fieldData[key])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                    
                    <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-[#0ea5e9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0284c7] disabled:opacity-50 shadow-sm">
                      {loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '⚡ Smart Check'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {status.message && (
              <div className={`mt-6 p-4 rounded-lg flex items-center gap-2 ${status.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                {status.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {status.type === 'info' && <Loader className="w-5 h-5 text-blue-600 animate-spin" />}
                <p className={`text-sm ${status.type === 'error' ? 'text-red-800' : status.type === 'success' ? 'text-green-800' : 'text-blue-800'}`}>{status.message}</p>
              </div>
            )}
          </div>
        )}

        {view === 'review' && result && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] rounded-xl p-8 text-white shadow-lg">
              <h2 className="text-3xl font-bold mb-2">✅ Analysis Complete!</h2>
              <p className="text-blue-50">{result.searchesUsed} Brave searches • {result.claudeCalls} Claude rewrite • {highlightedData?.changesCount || 0} changes highlighted</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-gray-600 text-sm">🔍 Brave Searches</div>
                <div className="text-[#0f172a] text-2xl font-bold">{result.searchesUsed}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-gray-600 text-sm">✨ Changes</div>
                <div className="text-[#0f172a] text-2xl font-bold">{highlightedData?.changesCount || 0}</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="text-gray-600 text-sm">⚡ Speed</div>
                <div className="text-[#0f172a] text-2xl font-bold">{(result.duration/1000).toFixed(1)}s</div>
              </div>
            </div>
            
            {/* Element detection and warnings */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-700 font-semibold mb-2">📊 Content Elements Detected:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">🖼️ Images:</span>
                  <span className="text-blue-900 font-semibold">{(editedContent.match(/<img/g) || []).length}</span>
                  {(editedContent.match(/<img/g) || []).length === 0 && (
                    <span className="text-orange-600" title="No images detected">⚠️</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">📊 Tables:</span>
                  <span className="text-blue-900 font-semibold">{(editedContent.match(/<table/g) || []).length}</span>
                  {(editedContent.match(/<table/g) || []).length === 0 && result.originalContent.match(/<table/g) && (
                    <span className="text-red-600" title="Tables were lost!">❌</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">🎬 Embeds:</span>
                  <span className="text-blue-900 font-semibold">
                    {(editedContent.match(/<iframe/g) || []).length + (editedContent.match(/<embed/g) || []).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">🔌 Widgets:</span>
                  <span className="text-blue-900 font-semibold">
                    {(editedContent.match(/class="[^"]*w-embed[^"]*"/g) || []).length + 
                     (editedContent.match(/class="[^"]*w-widget[^"]*"/g) || []).length}
                  </span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">✅ All elements preserved with original attributes and styling</p>
              
              {/* Warning if elements were lost */}
              {((editedContent.match(/<table/g) || []).length < (result.originalContent.match(/<table/g) || []).length) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-semibold">⚠️ Warning: Tables were lost during processing!</p>
                  <p className="text-red-700 text-xs mt-1">Backend converted tables to text. Click below to restore original content.</p>
                  <button
                    onClick={() => setEditedContent(result.originalContent)}
                    className="mt-2 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700"
                  >
                    🔄 Restore Original Content with Tables
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[#0f172a]">📄 Content Review:</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewMode('changes')} 
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'changes' 
                        ? 'bg-[#0ea5e9] text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✨ Before/After Diff
                  </button>
                  <button 
                    onClick={() => setViewMode('edit')} 
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      viewMode === 'edit' 
                        ? 'bg-[#0ea5e9] text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✏️ Edit Content
                  </button>
                </div>
              </div>

              {viewMode === 'edit' && (
                <div className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => setEditMode('visual')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                        editMode === 'visual' 
                          ? 'bg-[#0ea5e9] text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Eye className="w-4 h-4" /> Visual Editor
                    </button>
                    <button 
                      onClick={() => setEditMode('html')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                        editMode === 'html' 
                          ? 'bg-[#0ea5e9] text-white' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Code className="w-4 h-4" /> HTML Editor
                    </button>
                  </div>

                  {editMode === 'visual' ? (
                    <>
                      <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-sm">✨ Visual mode: Type naturally, add links (🔗), insert images (🖼️), format text</p>
                      </div>
                      <VisualEditor content={editedContent} onChange={setEditedContent} />
                    </>
                  ) : (
                    <>
                      <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-sm">✏️ HTML mode: Edit raw HTML directly • Live preview shows images and formatting • <span className="font-semibold">Click any image in preview to add/edit alt text</span></p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* HTML Code Editor */}
                        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
                            <span className="text-gray-300 text-xs font-semibold uppercase tracking-wide">HTML Source</span>
                          </div>
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-[800px] bg-gray-900 text-gray-100 font-mono text-sm p-4 focus:outline-none resize-none"
                            placeholder="Edit HTML content here..."
                            spellCheck="false"
                          />
                        </div>

                        {/* Live Preview */}
                        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                            <span className="text-gray-700 text-xs font-semibold uppercase tracking-wide">Live Preview</span>
                            <Eye className="w-4 h-4 text-gray-500" />
                          </div>
                          <style>{`
                            .html-preview img {
                              max-width: 100%;
                              height: auto;
                              display: block;
                              margin: 1rem 0;
                              cursor: pointer;
                              transition: all 0.2s;
                            }
                            .html-preview img:hover {
                              outline: 2px solid #0ea5e9;
                              outline-offset: 2px;
                            }
                            .html-preview table {
                              width: 100%;
                              border-collapse: collapse;
                              margin: 1.5rem 0;
                              border: 1px solid #e5e7eb;
                            }
                            .html-preview th {
                              background-color: #f3f4f6;
                              font-weight: 600;
                              text-align: left;
                              padding: 0.75rem;
                              border: 1px solid #e5e7eb;
                            }
                            .html-preview td {
                              padding: 0.75rem;
                              border: 1px solid #e5e7eb;
                            }
                            .html-preview tbody tr:nth-child(even) {
                              background-color: #f9fafb;
                            }
                            .html-preview iframe, .html-preview embed {
                              max-width: 100%;
                              margin: 1.5rem 0;
                              border: 1px solid #e5e7eb;
                              border-radius: 0.5rem;
                            }
                            .html-preview .w-embed, .html-preview [class*="w-"], .html-preview [data-w-id] {
                              margin: 1rem 0;
                            }
                            .html-preview figure {
                              margin: 1rem 0;
                              max-width: 100% !important;
                            }
                            .html-preview figure > div {
                              width: 100%;
                            }
                            .html-preview figure img {
                              width: 100%;
                              height: auto;
                            }
                            .html-preview .w-richtext-figure-type-image {
                              max-width: 100% !important;
                            }
                            .html-preview p {
                              margin: 0.75rem 0;
                              line-height: 1.6;
                            }
                            .html-preview h1 {
                              font-size: 2.25rem;
                              line-height: 2.5rem;
                              font-weight: 700;
                              margin: 2rem 0 1rem 0;
                              color: #0f172a;
                            }
                            .html-preview h2 {
                              font-size: 1.875rem;
                              line-height: 2.25rem;
                              font-weight: 700;
                              margin: 1.75rem 0 1rem 0;
                              color: #0f172a;
                            }
                            .html-preview h3 {
                              font-size: 1.5rem;
                              line-height: 2rem;
                              font-weight: 600;
                              margin: 1.5rem 0 0.75rem 0;
                              color: #1e293b;
                            }
                            .html-preview h4 {
                              font-size: 1.25rem;
                              line-height: 1.75rem;
                              font-weight: 600;
                              margin: 1.25rem 0 0.5rem 0;
                              color: #1e293b;
                            }
                            .html-preview h5 {
                              font-size: 1.125rem;
                              line-height: 1.5rem;
                              font-weight: 600;
                              margin: 1rem 0 0.5rem 0;
                              color: #334155;
                            }
                            .html-preview h6 {
                              font-size: 1rem;
                              line-height: 1.5rem;
                              font-weight: 600;
                              margin: 1rem 0 0.5rem 0;
                              color: #334155;
                            }
                            .html-preview a {
                              color: #0ea5e9;
                              text-decoration: underline;
                            }
                            .html-preview ul, .html-preview ol {
                              margin: 1rem 0;
                              padding-left: 2rem;
                            }
                          `}</style>
                          <div 
                            className="html-preview text-gray-800 overflow-y-auto p-4"
                            onClick={handleImageClick}
                            style={{ 
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              height: '800px',
                              lineHeight: '1.6'
                            }}
                            dangerouslySetInnerHTML={{ __html: editedContent }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {viewMode === 'changes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800 text-sm">✨ Full blog comparison • {highlightedData?.changesCount || 0} sections highlighted in blue</p>
                    </div>
                    <button
                      onClick={() => setShowHighlights(!showHighlights)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2"
                    >
                      {showHighlights ? '👁️ Hide Highlights' : '✨ Show Highlights'}
                    </button>
                  </div>
                  
                  <style>{`
                    .blog-content img {
                      max-width: 100%;
                      height: auto;
                      display: block;
                      margin: 1rem 0;
                    }
                    .blog-content figure {
                      margin: 1rem 0;
                      max-width: 100% !important;
                    }
                    .blog-content figure > div {
                      width: 100%;
                    }
                    .blog-content figure img {
                      width: 100%;
                      height: auto;
                    }
                    .blog-content .w-richtext-figure-type-image {
                      max-width: 100% !important;
                    }
                    .blog-content table {
                      width: 100%;
                      border-collapse: collapse;
                      margin: 1.5rem 0;
                      border: 1px solid #e5e7eb;
                    }
                    .blog-content th {
                      background-color: #f3f4f6;
                      font-weight: 600;
                      text-align: left;
                      padding: 0.75rem;
                      border: 1px solid #e5e7eb;
                    }
                    .blog-content td {
                      padding: 0.75rem;
                      border: 1px solid #e5e7eb;
                    }
                    .blog-content tbody tr:nth-child(even) {
                      background-color: #f9fafb;
                    }
                    .blog-content iframe, .blog-content embed {
                      max-width: 100%;
                      margin: 1.5rem 0;
                      border: 1px solid #e5e7eb;
                      border-radius: 0.5rem;
                    }
                    .blog-content .w-embed, .blog-content [class*="w-"], .blog-content [data-w-id] {
                      margin: 1rem 0;
                    }
                    .blog-content p {
                      margin: 0.75rem 0;
                      line-height: 1.6;
                    }
                    .blog-content h1 {
                      font-size: 2.25rem;
                      line-height: 2.5rem;
                      font-weight: 700;
                      margin: 2rem 0 1rem 0;
                      color: #0f172a;
                    }
                    .blog-content h2 {
                      font-size: 1.875rem;
                      line-height: 2.25rem;
                      font-weight: 700;
                      margin: 1.75rem 0 1rem 0;
                      color: #0f172a;
                    }
                    .blog-content h3 {
                      font-size: 1.5rem;
                      line-height: 2rem;
                      font-weight: 600;
                      margin: 1.5rem 0 0.75rem 0;
                      color: #1e293b;
                    }
                    .blog-content h4 {
                      font-size: 1.25rem;
                      line-height: 1.75rem;
                      font-weight: 600;
                      margin: 1.25rem 0 0.5rem 0;
                      color: #1e293b;
                    }
                    .blog-content h5 {
                      font-size: 1.125rem;
                      line-height: 1.5rem;
                      font-weight: 600;
                      margin: 1rem 0 0.5rem 0;
                      color: #334155;
                    }
                    .blog-content h6 {
                      font-size: 1rem;
                      line-height: 1.5rem;
                      font-weight: 600;
                      margin: 1rem 0 0.5rem 0;
                      color: #334155;
                    }
                    .blog-content a {
                      color: #0ea5e9;
                      text-decoration: underline;
                    }
                    .blog-content ul, .blog-content ol {
                      margin: 1rem 0;
                      padding-left: 2rem;
                    }
                  `}</style>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* BEFORE */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-300">
                      <div className="text-gray-700 text-sm font-bold mb-4 uppercase tracking-wide sticky top-0 bg-gray-50 py-2">
                        ❌ BEFORE (Original)
                      </div>
                      <div 
                        className="blog-content text-gray-800 overflow-y-auto bg-white rounded-lg p-4"
                        style={{ 
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          maxHeight: '800px'
                        }}
                        dangerouslySetInnerHTML={{ __html: result.originalContent }}
                      />
                    </div>

                    {/* AFTER with highlights */}
                    <div className="bg-white rounded-xl p-6 border border-[#0ea5e9]">
                      <div className="text-[#0ea5e9] text-sm font-bold mb-4 uppercase tracking-wide sticky top-0 bg-white py-2 flex items-center justify-between">
                        <span>✅ AFTER (Updated{showHighlights ? ' - Changes Highlighted' : ''})</span>
                      </div>
                      <div 
                        className="blog-content text-gray-800 overflow-y-auto bg-white rounded-lg p-4"
                        style={{ 
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          maxHeight: '800px'
                        }}
                        dangerouslySetInnerHTML={{ __html: showHighlights ? (highlightedData?.html || editedContent) : editedContent }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setView('dashboard')} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-200 border border-gray-300">← Cancel</button>
              <button onClick={publishToWebflow} disabled={loading} className="flex-2 bg-[#0ea5e9] text-white py-4 px-8 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {loading ? <><Loader className="w-5 h-5 animate-spin" />Publishing...</> : <><CheckCircle className="w-5 h-5" />Publish to Webflow</>}
              </button>
            </div>
            {status.message && (
              <div className={`p-4 rounded-lg ${status.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm ${status.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>{status.message}</p>
              </div>
            )}
          </div>
        )}

        {view === 'success' && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-[#0f172a] mb-2">Published!</h2>
            <p className="text-gray-600 mb-8">Content updated on Webflow</p>
            <button onClick={() => { setView('dashboard'); setResult(null); setSelectedBlog(null); }} className="bg-[#0ea5e9] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg">
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Image Alt Text Modal */}
      {imageAltModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">Edit Image Alt Text</h3>
            
            <div className="mb-4">
              <img src={imageAltModal.src} alt={imageAltModal.currentAlt} className="max-w-full h-auto rounded-lg border border-gray-200 mb-4" style={{ maxHeight: '300px' }} />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Alt Text (for accessibility & SEO)</label>
              <textarea
                value={imageAltModal.currentAlt}
                onChange={(e) => setImageAltModal({ ...imageAltModal, currentAlt: e.target.value })}
                placeholder="Describe this image for screen readers and SEO..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent resize-none"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">Good alt text: "Screenshot of SalesRobot dashboard showing campaign analytics"</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 border border-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={updateImageAlt}
                className="flex-1 bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg"
              >
                Save Alt Text
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#0f172a] border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400 text-sm">
          <p>🔒 All API keys stored securely in your browser</p>
          <p className="mt-2 text-gray-500">ContentOps • Brave Research → Claude Writing → Full Blog Diff</p>
        </div>
      </footer>
    </div>
  );
}
