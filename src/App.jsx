import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye } from 'lucide-react';

const BACKEND_URL = 'https://contentops-backend-production.up.railway.app';

const RESEARCH_PROMPT = `You are a professional fact-checker and researcher. Your job is to:
1. Verify ALL claims in the content: pricing, features, stats, company info, technical specs
2. Use Brave Search strategically: official websites first, 2-3 searches per topic, recent info (2024-2025)
3. Focus on LinkedIn/SalesRobot specifics
4. Check for missing AI/NEW features in competitor comparisons
5. Return structured findings with factChecks and missingFeatures arrays
Be thorough but concise. Focus on accuracy.`;

const WRITING_PROMPT = `You are an expert blog rewriter focused on clarity, accuracy, and engagement.
**CRITICAL WRITING RULES:**
NEVER USE: Em-dashes, banned words, sentences over 30 words, markdown syntax
ALWAYS USE: Contractions, active voice, short sentences, HTML bold tags (<strong> or <b>)
**CRITICAL: PRESERVE ALL SPECIAL ELEMENTS - DO NOT CONVERT TO TEXT**
- Keep ALL <iframe>, <script>, <embed>, <object>, <video>, <audio>, <canvas>, <form> tags EXACTLY as-is
- Keep ALL widget classes (w-embed-, w-widget-, info-widget, widget-, etc.) unchanged
- Keep ALL data attributes (data-*, w-*, webflow-*) unchanged
- Keep the "hidden" class on widget elements - DO NOT remove it
- Keep ALL widget structure and nested elements intact (widget-type, info-widget-heading, info-widget-content, etc.)
- NEVER convert widgets/embeds to text - keep them as functional HTML
- NEVER escape HTML in widgets - keep < > characters not &lt; &gt;
Return only the complete rewritten HTML content with all images, tables, widgets, iframes, scripts, and embeds preserved EXACTLY as HTML with no modifications.`;

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
    
    // Enhanced widget detection - preserve ALL special elements
    const isSpecialElement = 
      updatedBlock.match(/<(table|iframe|embed|script|img|figure|video|audio|canvas|object|svg|form)/i) ||
      updatedBlock.match(/class="[^"]*widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*-widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-embed[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-widget[^"]*"/i) ||
      updatedBlock.match(/data-w-id/i) ||
      updatedBlock.match(/data-widget/i) ||
      updatedBlock.includes('<script') ||
      updatedBlock.includes('<iframe') ||
      updatedBlock.includes('<embed');
    
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
      if (e.ctrlKey || e.metaKey) return;
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
      setShowHighlights(true);
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
              <p className="text-xl text-gray-600">Pure Brave research • AI-powered rewrites • Full blog diff view</p>
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
              <button onClick={fetchBlogs} disabled={loading} className="bg-white text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border hover:bg-gray-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
            </div>
            {loading ? (
              <div className="text-center py-12"><Loader className="w-12 h-12 text-[#0ea5e9] animate-spin mx-auto mb-4" /><p className="text-gray-600">Loading...</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <div key={blog.id} className="bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-all">
                    <h3 className="font-semibold text-[#0f172a] mb-2 line-clamp-2">{blog.fieldData.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{blog.fieldData['post-summary'] || 'No description'}</p>
                    <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-[#0ea5e9] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0284c7] disabled:opacity-50">{loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '⚡ Smart Check'}</button>
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
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0ea5e9] to-[#06b6d4] rounded-xl p-8 text-white shadow-lg">
              <h2 className="text-3xl font-bold mb-2">✅ Analysis Complete!</h2>
              <p className="text-blue-50">{result.searchesUsed} searches • {highlightedData?.changesCount || 0} changes</p>
            </div>

            <div className="bg-white rounded-xl p-6 border shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-[#0f172a]">📄 Content Review</h3>
                <div className="flex gap-2">
                  <button onClick={() => setViewMode('changes')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${viewMode === 'changes' ? 'bg-[#0ea5e9] text-white' : 'bg-gray-100'}`}>✨ Diff</button>
                  <button onClick={() => setViewMode('edit')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${viewMode === 'edit' ? 'bg-[#0ea5e9] text-white' : 'bg-gray-100'}`}>✏️ Edit</button>
                </div>
              </div>

              {viewMode === 'edit' && (
                <div className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setEditMode('visual')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${editMode === 'visual' ? 'bg-[#0ea5e9] text-white' : 'bg-gray-100'}`}><Eye className="w-4 h-4" />Visual</button>
                    <button onClick={() => setEditMode('html')} className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${editMode === 'html' ? 'bg-[#0ea5e9] text-white' : 'bg-gray-100'}`}><Code className="w-4 h-4" />HTML</button>
                  </div>
                  {editMode === 'visual' ? (
                    <VisualEditor content={editedContent} onChange={setEditedContent} />
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="bg-gray-800 px-4 py-2"><span className="text-gray-300 text-xs font-semibold">HTML</span></div>
                        <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full h-[800px] bg-gray-900 text-gray-100 font-mono text-sm p-4 focus:outline-none resize-none" spellCheck="false" />
                      </div>
                      <div className="bg-white rounded-lg border overflow-hidden">
                        <style>{`
                          .editable-preview h1 {
                            font-size: 2.25rem;
                            font-weight: 700;
                            margin: 2rem 0 1rem 0;
                            color: #0f172a;
                          }
                          .editable-preview h2 {
                            font-size: 1.875rem;
                            font-weight: 700;
                            margin: 1.75rem 0 1rem 0;
                            color: #0f172a;
                          }
                          .editable-preview h3 {
                            font-size: 1.5rem;
                            font-weight: 600;
                            margin: 1.5rem 0 0.75rem 0;
                            color: #1e293b;
                          }
                          .editable-preview h4 {
                            font-size: 1.25rem;
                            font-weight: 600;
                            margin: 1.25rem 0 0.5rem 0;
                            color: #1e293b;
                          }
                          .editable-preview img {
                            max-width: 100%;
                            height: auto;
                            display: block;
                            margin: 1rem 0;
                          }
                          .editable-preview iframe {
                            max-width: 100%;
                            width: 100%;
                            min-height: 400px;
                            margin: 1.5rem 0;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                          }
                          .editable-preview embed,
                          .editable-preview object {
                            max-width: 100%;
                            margin: 1.5rem 0;
                          }
                          /* Override hidden class for widget content */
                          .editable-preview .info-widget .hidden,
                          .editable-preview [class*="widget"] .hidden,
                          .editable-preview [class*="-widget"] .hidden,
                          .editable-preview [class*="w-embed"] .hidden,
                          .editable-preview [class*="w-widget"] .hidden {
                            display: block !important;
                            visibility: visible !important;
                          }
                          /* Generic styling for ALL widget types */
                          .editable-preview [class*="-widget"],
                          .editable-preview [class*="widget-"] {
                            margin: 1.5rem 0;
                            padding: 1.5rem;
                            border-radius: 6px;
                          }
                          /* Style info-widget boxes (blue) */
                          .editable-preview .info-widget,
                          .editable-preview [class*="info-widget"] {
                            background-color: #f0f9ff;
                            border-left: 4px solid #0ea5e9;
                          }
                          /* Style warning/caution widgets (yellow/orange) */
                          .editable-preview .warning-widget,
                          .editable-preview .caution-widget,
                          .editable-preview [class*="warning-widget"],
                          .editable-preview [class*="caution-widget"] {
                            background-color: #fef3c7;
                            border-left: 4px solid #f59e0b;
                          }
                          /* Style success/tip widgets (green) */
                          .editable-preview .success-widget,
                          .editable-preview .tip-widget,
                          .editable-preview [class*="success-widget"],
                          .editable-preview [class*="tip-widget"] {
                            background-color: #d1fae5;
                            border-left: 4px solid #10b981;
                          }
                          /* Style error/danger widgets (red) */
                          .editable-preview .error-widget,
                          .editable-preview .danger-widget,
                          .editable-preview [class*="error-widget"],
                          .editable-preview [class*="danger-widget"] {
                            background-color: #fee2e2;
                            border-left: 4px solid #ef4444;
                          }
                          /* Generic widget heading styles */
                          .editable-preview [class*="widget-heading"],
                          .editable-preview [class*="-widget-heading"] {
                            font-size: 1.125rem;
                            font-weight: 600;
                            margin: 0 0 0.75rem 0;
                          }
                          /* Widget type labels */
                          .editable-preview .widget-type,
                          .editable-preview [class*="widget-type"] {
                            display: inline-block;
                            font-size: 0.875rem;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            margin-bottom: 0.5rem;
                          }
                          .editable-preview [class*="widget"],
                          .editable-preview [class*="w-embed"],
                          .editable-preview [class*="w-widget"] {
                            margin: 1.5rem 0;
                            max-width: 100%;
                          }
                          .editable-preview table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 1.5rem 0;
                            border: 1px solid #e5e7eb;
                          }
                          .editable-preview th {
                            background-color: #f3f4f6;
                            padding: 0.75rem;
                            border: 1px solid #e5e7eb;
                          }
                          .editable-preview td {
                            padding: 0.75rem;
                            border: 1px solid #e5e7eb;
                          }
                          .editable-preview p {
                            margin: 0.75rem 0;
                          }
                        `}</style>
                        <div className="bg-gray-50 px-4 py-2"><span className="text-gray-700 text-xs font-semibold">Preview</span></div>
                        <div ref={editablePreviewRef} className="editable-preview text-gray-800 overflow-y-auto p-4" contentEditable={true} suppressContentEditableWarning={true} onInput={handleEditablePreviewInput} onClick={handleContentClick} style={{ height: '800px', outline: 'none' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'changes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex-1 mr-3">
                      <p className="text-blue-800 text-sm">✨ <span className="font-semibold">Edit directly!</span> {showHighlights && <span>• <span className="font-semibold">{highlightedData?.changesCount || 0} changes</span> shown</span>}</p>
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
                      /* Style info-widget boxes (blue) */
                      .blog-content .info-widget,
                      .blog-content [class*="info-widget"] {
                        background-color: #f0f9ff;
                        border-left: 4px solid #0ea5e9;
                      }
                      /* Style warning/caution widgets (yellow/orange) */
                      .blog-content .warning-widget,
                      .blog-content .caution-widget,
                      .blog-content [class*="warning-widget"],
                      .blog-content [class*="caution-widget"] {
                        background-color: #fef3c7;
                        border-left: 4px solid #f59e0b;
                      }
                      /* Style success/tip widgets (green) */
                      .blog-content .success-widget,
                      .blog-content .tip-widget,
                      .blog-content [class*="success-widget"],
                      .blog-content [class*="tip-widget"] {
                        background-color: #d1fae5;
                        border-left: 4px solid #10b981;
                      }
                      /* Style error/danger widgets (red) */
                      .blog-content .error-widget,
                      .blog-content .danger-widget,
                      .blog-content [class*="error-widget"],
                      .blog-content [class*="danger-widget"] {
                        background-color: #fee2e2;
                        border-left: 4px solid #ef4444;
                      }
                      /* Generic widget heading styles */
                      .blog-content [class*="widget-heading"],
                      .blog-content [class*="-widget-heading"] {
                        font-size: 1.125rem;
                        font-weight: 600;
                        margin: 0 0 0.75rem 0;
                      }
                      .blog-content .info-widget [class*="heading"] {
                        color: #0ea5e9;
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
                      /* Generic widget content styles */
                      .blog-content [class*="widget-content"],
                      .blog-content [class*="-widget-content"] {
                        color: #1e293b;
                        line-height: 1.7;
                      }
                      .blog-content [class*="widget-content"] p,
                      .blog-content [class*="-widget-content"] p {
                        margin: 0;
                      }
                      /* Widget type labels */
                      .blog-content .widget-type,
                      .blog-content [class*="widget-type"] {
                        display: inline-block;
                        font-size: 0.875rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 0.5rem;
                      }
                      .blog-content .info-widget .widget-type {
                        color: #0ea5e9;
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
                      .blog-content li {
                        margin: 0.5rem 0;
                        line-height: 1.7;
                      }
                    `}</style>
                    <div className="text-[#0ea5e9] text-sm font-bold mb-2">📝 EDITABLE CONTENT</div>
                    <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 border rounded-lg flex-wrap">
                      <button onClick={() => formatText('bold')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 font-bold text-sm" title="Bold">B</button>
                      <button onClick={() => formatText('italic')} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 italic text-sm" title="Italic">I</button>
                      <div className="w-px h-6 bg-gray-300"></div>
                      <button onClick={() => formatHeading(1)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm font-bold" title="Heading 1">H1</button>
                      <button onClick={() => formatHeading(2)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm font-bold" title="Heading 2">H2</button>
                      <button onClick={() => formatHeading(3)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Heading 3">H3</button>
                      <button onClick={() => formatHeading(4)} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Heading 4">H4</button>
                      <div className="w-px h-6 bg-gray-300"></div>
                      <button onClick={insertLink} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Add Link">🔗</button>
                      <button onClick={insertImage} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-100 text-sm" title="Add Image">🖼️</button>
                    </div>
                    <div ref={afterViewRef} className="blog-content text-gray-800 overflow-y-auto bg-white rounded-lg p-6 min-h-[600px]" contentEditable={true} suppressContentEditableWarning={true} onInput={handleAfterViewInput} onClick={handleContentClick} style={{ maxHeight: '800px', outline: 'none', cursor: 'text' }} />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setView('dashboard')} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-200">← Cancel</button>
              <button onClick={publishToWebflow} disabled={loading} className="flex-2 bg-[#0ea5e9] text-white py-4 px-8 rounded-lg font-semibold hover:bg-[#0284c7] disabled:opacity-50 flex items-center gap-2 shadow-lg">{loading ? <><Loader className="w-5 h-5 animate-spin" />Publishing...</> : <><CheckCircle className="w-5 h-5" />Publish</>}</button>
            </div>
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
            <label className="block text-sm font-semibold mb-2">URL</label>
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="w-full bg-gray-50 border rounded px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]" autoFocus onKeyPress={(e) => e.key === 'Enter' && applyLink()} />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowLinkModal(false); setLinkUrl(''); setEditingLink(null); }} className="flex-1 bg-gray-100 py-3 rounded font-semibold">Cancel</button>
              {editingLink && <button onClick={() => { if (editingLink) { editingLink.parentNode.replaceChild(document.createTextNode(editingLink.textContent), editingLink); if (afterViewRef.current) setEditedContent(afterViewRef.current.innerHTML); } setShowLinkModal(false); setLinkUrl(''); setEditingLink(null); }} className="flex-1 bg-red-500 text-white py-3 rounded font-semibold">Remove</button>}
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
