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
- Keep ALL custom widget classes (info-widget, widget-type, widget-content, etc.)
- Keep ALL data attributes (data-*, w-*, webflow-*)
- Keep ALL "hidden" classes - do not remove them
- Do NOT remove, modify, simplify, or relocate any images, tables, widgets, or embeds
- All special elements should stay in their original positions in the content

**SALESROBOT SPECIFIC UPDATES - ONLY WHERE ALREADY MENTIONED:**
⚠️ CRITICAL: Do NOT add "SalesRobot" text or links where they don't already exist!

**YOUR REWRITING PROCESS:**
1. Fix factual errors found by research
2. Add missing AI features
3. Fix grammar
4. Preserve structure
5. Add TL;DR if missing

Return only the complete rewritten HTML content with all images, tables, and widgets preserved exactly as HTML.`;

const createHighlightedHTML = (originalHTML, updatedHTML) => {
  const stripHTML = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  const splitIntoBlocks = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const container = doc.body.firstChild;
    const blocks = [];
    
    Array.from(container.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        blocks.push(node.outerHTML);
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        blocks.push(node.textContent);
      }
    });
    
    return blocks;
  };
  
  const originalBlocks = splitIntoBlocks(originalHTML);
  const updatedBlocks = splitIntoBlocks(updatedHTML);
  
  const originalMap = new Map();
  originalBlocks.forEach((block, idx) => {
    const cleaned = stripHTML(block);
    if (cleaned && cleaned.length > 5) {
      originalMap.set(cleaned, { html: block, index: idx });
    }
  });
  
  let highlightedHTML = '';
  let changesCount = 0;
  
  updatedBlocks.forEach((updatedBlock) => {
    const cleanedUpdated = stripHTML(updatedBlock);
    const match = originalMap.get(cleanedUpdated);
    
    const isSpecialElement = 
      updatedBlock.match(/<(table|iframe|embed|script|img|figure)/i) ||
      updatedBlock.match(/class="[^"]*widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-embed[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*info-widget[^"]*"/i) ||
      updatedBlock.match(/data-w-id/i);
    
    if (!match && cleanedUpdated.length > 20 && !isSpecialElement) {
      const highlighted = `<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">${updatedBlock}</div>`;
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
          // Ignore
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
        .ql-editor .info-widget {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 1rem;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
        }
        .ql-editor .hidden {
          display: block !important;
          visibility: visible !important;
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
  const editablePreviewRef = useRef(null);
  const afterViewRef = useRef(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [savedSelection, setSavedSelection] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }
  }, []);

  // FIX: Only calculate highlights ONCE when result changes, not on every edit
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

  // FIX: Removed highlightedData from dependencies to prevent loop
  useEffect(() => {
    if (afterViewRef.current && viewMode === 'changes') {
      const contentToShow = showHighlights 
        ? (highlightedData?.html || editedContent) 
        : editedContent;
      afterViewRef.current.innerHTML = contentToShow;
    }
  }, [viewMode, showHighlights, editedContent]);

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
      if (formattedParent.tagName === tag || 
          (command === 'bold' && formattedParent.tagName === 'B') ||
          (command === 'italic' && formattedParent.tagName === 'I')) {
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

  const formatHeading = (level) => {
    if (!afterViewRef.current) return;
    afterViewRef.current.focus();
    document.execCommand('formatBlock', false, `<h${level}>`);
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
          setShowLinkModal(true);
          return;
        }
        element = element.parentElement;
      }
    }
    
    saveSelection();
    setEditingLink(null);
    setLinkUrl('');
    setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkUrl) return;
    
    if (editingLink) {
      editingLink.href = linkUrl;
      editingLink.target = '_blank';
      editingLink.rel = 'noopener noreferrer';
    } else {
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
        link.textContent = selectedText || linkUrl;
        
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
    if (e.target.tagName === 'IMG') {
      const src = e.target.src;
      const alt = e.target.alt || '';
      const imgIndex = Array.from(e.currentTarget.querySelectorAll('img')).indexOf(e.target);
      setImageAltModal({ show: true, src, currentAlt: alt, index: imgIndex });
      return;
    }
    
    if (e.target.tagName === 'A') {
      if (e.ctrlKey || e.metaKey) {
        return;
      }
      
      e.preventDefault();
      setEditingLink(e.target);
      setLinkUrl(e.target.href);
      setShowLinkModal(true);
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

  const deleteImage = () => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }
    
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
    
    const fullOriginalContent = blog.fieldData['post-body'] || '';
    
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
      updatedContent = updatedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // FIX: Calculate highlights immediately after analysis
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
      setStatus({ type: 'success', message: `✅ Complete! ${data.searchesUsed} searches, ${data.claudeCalls} rewrites, ${highlighted.changesCount} changes` });
      setView('review');
      setViewMode('changes');
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
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
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Brave Search API Key</label>
                  <input type="password" value={config.braveKey} onChange={(e) => setConfig({...config, braveKey: e.target.value})} placeholder="BSA..." className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent" />
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
                <p className="text-gray-600 text-sm mt-1">Click to analyze</p>
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
                  <div key={blog.id} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                    <h3 className="font-semibold text-[#0f172a] mb-2 line-clamp-2">{blog.fieldData.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{blog.fieldData['post-summary'] || 'No description'}</p>
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
                        <p className="text-blue-800 text-sm">✨ Visual mode: Type naturally, add links, insert images, format text</p>
                      </div>
                      <VisualEditor content={editedContent} onChange={setEditedContent} />
                    </>
                  ) : (
                    <>
                      <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 text-sm">✏️ HTML mode: Edit raw HTML or click in preview to edit visually</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                        <div className="bg-white rounded-lg border-2 border-green-400 overflow-hidden shadow-md">
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-2 border-b border-green-200 flex items-center justify-between">
                            <span className="text-gray-700 text-xs font-semibold uppercase tracking-wide flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              ✏️ Live Preview
                            </span>
                            <span className="text-xs text-green-600 font-semibold">Click to edit</span>
                          </div>
                          <style>{`
                            .html-preview img {
                              max-width: 100%;
                              height: auto;
                              display: block;
                              margin: 1rem 0;
                              cursor: pointer;
                            }
                            .html-preview table {
                              width: 100%;
                              border-collapse: collapse;
                              margin: 1.5rem 0;
                              border: 1px solid #e5e7eb;
                            }
                            .html-preview th {
                              background-color: #f3f4f6;
                              padding: 0.75rem;
                              border: 1px solid #e5e7eb;
                            }
                            .html-preview td {
                              padding: 0.75rem;
                              border: 1px solid #e5e7eb;
                            }
                            .html-preview p {
                              margin: 0.75rem 0;
                            }
                            .html-preview h1 {
                              font-size: 2.25rem;
                              font-weight: 700;
                              margin: 2rem 0 1rem 0;
                            }
                            .html-preview h2 {
                              font-size: 1.875rem;
                              font-weight: 700;
                              margin: 1.75rem 0 1rem 0;
                            }
                            .html-preview h3 {
                              font-size: 1.5rem;
                              font-weight: 600;
                              margin: 1.5rem 0 0.75rem 0;
                            }
                          `}</style>
                          <div 
                            ref={editablePreviewRef}
                            className="html-preview text-gray-800 overflow-y-auto p-4"
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onInput={handleEditablePreviewInput}
                            onClick={handleContentClick}
                            style={{ 
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              height: '800px',
                              outline: 'none',
                              cursor: 'text'
                            }}
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
                    <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex-1 mr-3">
                      <p className="text-blue-800 text-sm">
                        ✨ <span className="font-semibold">Edit content directly!</span> Use toolbar to format
                        {showHighlights && <span className="ml-1 text-blue-600"><span className="font-semibold">{highlightedData?.changesCount || 0} AI changes</span> highlighted</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowHighlights(!showHighlights)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap ${
                        showHighlights 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {showHighlights ? '✨ Hide Changes' : '👁️ Show Changes'}
                    </button>
                  </div>
                  
                  <style>{`
                    .blog-content img {
                      max-width: 100%;
                      height: auto;
                      display: block;
                      margin: 1rem 0;
                      cursor: pointer;
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
                    }
                    .blog-content td {
                      padding: 0.75rem;
                      border: 1px solid #e5e7eb;
                    }
                    .blog-content p {
                      margin: 0.75rem 0;
                    }
                    .blog-content h1 {
                      font-size: 2.25rem;
                      font-weight: 700;
                      margin: 2rem 0 1rem 0;
                    }
                    .blog-content h2 {
                      font-size: 1.875rem;
                      font-weight: 700;
                      margin: 1.75rem 0 1rem 0;
                    }
                    .blog-content h3 {
                      font-size: 1.5rem;
                      font-weight: 600;
                      margin: 1.5rem 0 0.75rem 0;
                    }
                  `}</style>
                  
                  <div className="bg-white rounded-xl p-6 border-2 border-[#0ea5e9] shadow-lg">
                    <div className="text-[#0ea5e9] text-sm font-bold mb-2 uppercase tracking-wide flex items-center justify-between">
                      <span>📝 EDITABLE CONTENT {showHighlights && '(Changes Highlighted)'}</span>
                      <span className="text-xs text-green-600 font-semibold normal-case">Click to edit</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => formatText('bold')}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 font-bold text-sm"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          onClick={() => formatText('italic')}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 italic text-sm"
                          title="Italic"
                        >
                          I
                        </button>
                      </div>
                      
                      <div className="w-px h-6 bg-gray-300"></div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => formatHeading(1)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                          title="H1"
                        >
                          H1
                        </button>
                        <button
                          onClick={() => formatHeading(2)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-bold"
                          title="H2"
                        >
                          H2
                        </button>
                        <button
                          onClick={() => formatHeading(3)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-semibold"
                          title="H3"
                        >
                          H3
                        </button>
                      </div>
                      
                      <div className="w-px h-6 bg-gray-300"></div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={insertLink}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                          title="Add Link"
                        >
                          🔗 Link
                        </button>
                        <button
                          onClick={insertImage}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm"
                          title="Add Image"
                        >
                          🖼️ Image
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      ref={afterViewRef}
                      className="blog-content text-gray-800 overflow-y-auto bg-white rounded-lg p-6 min-h-[600px]"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onInput={handleAfterViewInput}
                      onClick={handleContentClick}
                      style={{ 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        maxHeight: '800px',
                        outline: 'none',
                        cursor: 'text'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setView('dashboard')} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-200">← Cancel</button>
              <button onClick={publishToWebflow} disabled={loading} className="flex-2 bg-[#0ea5e9] text-white py-4 px-8 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                {loading ? <><Loader className="w-5 h-5 animate-spin" />Publishing...</> : <><CheckCircle className="w-5 h-5" />Publish</>}
              </button>
            </div>
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

      {imageAltModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">Edit Image</h3>
            <div className="mb-4">
              <img src={imageAltModal.src} alt={imageAltModal.currentAlt} className="max-w-full h-auto rounded-lg border border-gray-200 mb-4" style={{ maxHeight: '300px' }} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Alt Text</label>
              <textarea
                value={imageAltModal.currentAlt}
                onChange={(e) => setImageAltModal({ ...imageAltModal, currentAlt: e.target.value })}
                placeholder="Describe this image..."
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] resize-none"
                rows="3"
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={deleteImage}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 shadow-lg"
              >
                🗑️ Delete
              </button>
              <button 
                onClick={updateImageAlt}
                className="flex-1 bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowLinkModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">
              {editingLink ? '✏️ Edit Link' : '🔗 Add Link'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Link URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && applyLink()}
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { 
                  setShowLinkModal(false); 
                  setLinkUrl(''); 
                  setEditingLink(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
              {editingLink && (
                <button 
                  onClick={() => {
                    if (editingLink) {
                      const text = editingLink.textContent;
                      const textNode = document.createTextNode(text);
                      editingLink.parentNode.replaceChild(textNode, editingLink);
                      if (afterViewRef.current) {
                        setEditedContent(afterViewRef.current.innerHTML);
                      }
                    }
                    setShowLinkModal(false);
                    setLinkUrl('');
                    setEditingLink(null);
                  }}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 shadow-lg"
                >
                  🗑️ Remove
                </button>
              )}
              <button 
                onClick={applyLink}
                className="flex-1 bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg"
              >
                {editingLink ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-[#0f172a] mb-4">🖼️ Add Image</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImageUrl('');
                  }
                }}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
              />
              {imageFile && <p className="text-xs text-green-700 mt-2">✓ {imageFile.name}</p>}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-sm text-gray-500 font-semibold">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageFile(null);
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                onKeyPress={(e) => e.key === 'Enter' && applyImage()}
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { 
                  setShowImageModal(false); 
                  setImageUrl(''); 
                  setImageFile(null);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={applyImage}
                className="flex-1 bg-[#0ea5e9] text-white py-3 rounded-lg font-semibold hover:bg-[#0284c7] shadow-lg"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#0f172a] border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400 text-sm">
          <p>🔒 All API keys stored securely in your browser</p>
        </div>
      </footer>
    </div>
  );
}
