import React, { useState, useEffect, useRef } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles, Code, Eye, Link as LinkIcon, Image as ImageIcon, Bold, Italic, Heading1, Heading2, Heading3 } from 'lucide-react';

const BACKEND_URL = 'https://contentops-backend-production.up.railway.app';

const BOFU_RESEARCH_PROMPT = `You are a professional fact-checker and researcher. Your job is to:
1. Verify ALL claims in the content: pricing, features, stats, company info, technical specs
2. Use Brave Search strategically: official websites first, 2-3 searches per topic, recent info (2024-2025)
3. Focus on LinkedIn/SalesRobot specifics
4. Check for missing AI/NEW features in competitor comparisons
5. Return structured findings with factChecks and missingFeatures arrays
Be thorough but concise. Focus on accuracy.`;

const TOFU_RESEARCH_PROMPT = `You are a professional fact-checker for educational content. Your job is to:
1. Verify general industry claims and statistics about LinkedIn, sales automation, and B2B outreach
2. Use Brave Search to check: industry trends (2024-2025), best practices from authoritative sources, general statistics
3. Focus on educational accuracy: LinkedIn platform stats, general limits/policies, industry benchmarks, common best practices
4. Verify definitions, terminology, and conceptual explanations
5. Check recent trends and developments in the space
Be thorough but focus on educational accuracy, not product specifics. Return structured findings with factChecks array.`;

const MOFU_RESEARCH_PROMPT = `You are a professional fact-checker for consideration-stage content. Your job is to:
1. Verify framework claims, methodologies, and strategic guidance
2. Use Brave Search to check: use case examples, industry comparisons, solution categories, implementation best practices
3. Focus on buyer guidance: "how to choose" criteria, solution category definitions, implementation timelines, use case validation
4. Check authoritative sources for recommendations and guidance
5. Balance general information with solution category comparisons
Be thorough and balanced. Focus on helping buyers make informed decisions. Return structured findings with factChecks array.`;

const detectBlogType = (title) => {
  const titleLower = title.toLowerCase();
  const bofuKeywords = ['vs ', ' vs.', 'versus', 'alternative', 'alternatives', 'review', 'pricing', 'comparison', 'compare', 'better than', 'or ', 'which is better', 'worth it', 'pros and cons'];
  const tofuKeywords = ['what is', 'what are', 'why', 'top 10', 'top 5', 'tips', 'guide to', 'introduction', 'beginner', 'basics', 'explained', 'definition', 'ultimate guide', 'complete guide'];
  const mofuKeywords = ['how to', 'best practices', 'getting started', 'choosing', 'selecting', 'framework', 'strategy', 'guide for', 'steps to', 'ways to', 'mistakes to avoid', 'should you', 'when to use'];
  
  if (bofuKeywords.some(keyword => titleLower.includes(keyword))) return 'BOFU';
  if (tofuKeywords.some(keyword => titleLower.includes(keyword))) return 'TOFU';
  if (mofuKeywords.some(keyword => titleLower.includes(keyword))) return 'MOFU';
  if (/\d+/.test(titleLower) && (titleLower.includes('tips') || titleLower.includes('ways'))) return 'TOFU';
  return 'MOFU';
};

const WRITING_PROMPT = `You are an expert blog rewriter focused on clarity, accuracy, and engagement.
**CRITICAL WRITING RULES:**
NEVER USE: Em-dashes, banned words, sentences over 30 words, markdown syntax
ALWAYS USE: Contractions, active voice, short sentences, HTML bold tags (<strong> or <b>)
**CRITICAL: PRESERVE ALL SPECIAL ELEMENTS - DO NOT CONVERT TO TEXT**
- Keep ALL <iframe>, <script>, <embed>, <object>, <video>, <audio>, <canvas>, <form> tags EXACTLY as-is
- Keep ALL widget classes (w-embed-, w-widget-, info-widget, widget-, etc.) unchanged
- Keep ALL data attributes (data-*, w-*, webflow-*) unchanged
- Keep the "hidden" class on widget elements - DO NOT remove it
- Keep ALL widget structure and nested elements intact
- NEVER convert widgets/embeds to text - keep them as functional HTML
- NEVER escape HTML in widgets - keep < > characters not &lt; &gt;
Return only the complete rewritten HTML content with all images, tables, widgets, iframes, scripts, and embeds preserved EXACTLY as HTML with no modifications.`;

const createHighlightedHTML = (originalHTML, updatedHTML) => {
  const normalize = (html) => {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  };
  
  const stripHTML = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  const parser = new DOMParser();
  const originalDoc = parser.parseFromString(`<div>${originalHTML}</div>`, 'text/html');
  const updatedDoc = parser.parseFromString(`<div>${updatedHTML}</div>`, 'text/html');
  
  const originalContainer = originalDoc.body.firstChild;
  const updatedContainer = updatedDoc.body.firstChild;
  
  const getBlocks = (container) => {
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
  
  const originalBlocks = getBlocks(originalContainer);
  const updatedBlocks = getBlocks(updatedContainer);
  
  const originalSet = new Set(originalBlocks.map(b => normalize(b)));
  
  let highlightedHTML = '';
  let changesCount = 0;
  
  updatedBlocks.forEach((updatedBlock) => {
    const normalizedUpdated = normalize(updatedBlock);
    const existsInOriginal = originalSet.has(normalizedUpdated);
    
    const isSpecialElement = 
      updatedBlock.match(/<(table|iframe|embed|script|img|figure|video|audio|canvas|object|svg|form)/i) ||
      updatedBlock.match(/class="[^"]*widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*-widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-embed[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-widget[^"]*"/i) ||
      updatedBlock.match(/class="[^"]*w-richtext[^"]*"/i) ||
      updatedBlock.match(/data-w-id/i) ||
      updatedBlock.match(/data-widget/i) ||
      updatedBlock.includes('<script') ||
      updatedBlock.includes('<iframe') ||
      updatedBlock.includes('<embed');
    
    const textContent = stripHTML(updatedBlock);
    
    if (!existsInOriginal && textContent.length > 20 && !isSpecialElement) {
      const highlighted = `<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">${updatedBlock}</div>`;
      highlightedHTML += highlighted;
      changesCount++;
    } else {
      highlightedHTML += updatedBlock;
    }
  });
  
  return { html: highlightedHTML, changesCount };
};

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
  const [editedContent, setEditedContent] = useState('');
  const [highlightedData, setHighlightedData] = useState(null);
  const [imageAltModal, setImageAltModal] = useState({ show: false, src: '', currentAlt: '', index: -1 });
  const [showHighlights, setShowHighlights] = useState(true);
  const afterViewRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const isSyncingRef = useRef(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [savedSelection, setSavedSelection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBlogs, setFilteredBlogs] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }
    
    // Load CSV blogs from repository on mount
    loadBlogsFromCSV();
  }, []);

  const loadBlogsFromCSV = async () => {
    try {
      setLoading(true);
      setStatus({ type: 'info', message: 'Loading blogs from CSV...' });
      
      // Fetch CSV from repository
      const response = await fetch('/blogs.csv');
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSV file');
      }
      
      const csvText = await response.text();
      
      // Parse CSV using Papa Parse
      const Papa = await import('https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm');
      
      Papa.default.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          console.log('📊 CSV Headers:', results.meta.fields);
          console.log('📊 First row sample:', results.data[0]);
          
          // Transform CSV data to match blog format
          const blogsData = results.data
            .filter(row => row['Title'] || row['Name'])
            .map((row, index) => {
              const fieldData = {
                name: row['Title'] || row['Name'] || `Blog ${index + 1}`,
                'post-summary': row['Meta Description'] || row['Summary'] || '',
                slug: row['Slug'] || row['URL'] || '',
                'main-image': row['Featured Image'] || row['Image URL'] || '',
                category: row['Category'] || row['Type'] || '',
                author: row['Author'] || '',
                datePublished: row['Date Published'] || row['Published Date'] || '',
                dateUpdated: row['Date Updated'] || row['Last Modified'] || '',
                status: row['Status'] || 'published',
                wordCount: row['Word Count'] || '',
                metaTitle: row['Meta Title'] || row['Title'] || '',
                metaDescription: row['Meta Description'] || '',
                focusKeyword: row['Focus Keyword'] || row['Primary Keyword'] || '',
                canonicalUrl: row['Canonical URL'] || row['URL'] || '',
                featuredImageUrl: row['Featured Image'] || row['Image URL'] || '',
                _rawData: row
              };
              
              return {
                id: row['Item ID'] || row['ID'] || row['Post ID'] || `blog_${index}`,
                fieldData: fieldData
              };
            });
          
          setBlogs(blogsData);
          setFilteredBlogs(blogsData);
          
          localStorage.setItem('contentops_csv_blogs', JSON.stringify(blogsData));
          
          setStatus({ type: 'success', message: `✅ Loaded ${blogsData.length} blogs from CSV` });
          console.log('✅ Loaded', blogsData.length, 'blogs from CSV');
          console.log('📋 Sample blog:', blogsData[0]);
          
          setTimeout(() => setStatus({ type: '', message: '' }), 3000);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          setStatus({ type: 'error', message: '❌ Failed to parse CSV file' });
        }
      });
      
    } catch (error) {
      console.error('Error loading CSV:', error);
      setStatus({ type: 'error', message: '❌ Failed to load blogs from CSV' });
      
      const savedCsv = localStorage.getItem('contentops_csv_blogs');
      if (savedCsv) {
        try {
          const parsed = JSON.parse(savedCsv);
          setBlogs(parsed);
          setFilteredBlogs(parsed);
          setStatus({ type: 'info', message: `📦 Loaded ${parsed.length} blogs from cache` });
          console.log('📦 Loaded from cache:', parsed.length, 'blogs');
        } catch (e) {
          console.error('Failed to parse cached CSV blogs:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBlogs(blogs);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = blogs.filter(blog => 
        blog.fieldData.name?.toLowerCase().includes(term) ||
        blog.fieldData['post-summary']?.toLowerCase().includes(term) ||
        blog.id?.toLowerCase().includes(term)
      );
      setFilteredBlogs(filtered);
    }
  }, [blogs, searchTerm]);

  useEffect(() => {
    if (result && editedContent && result.originalContent) {
      const highlighted = createHighlightedHTML(result.originalContent, editedContent);
      console.log('🎨 Highlighting created:', highlighted.changesCount, 'changes found');
      setHighlightedData(highlighted);
    }
  }, [editedContent, result]);

  useEffect(() => {
    if (isUserEditingRef.current || isSyncingRef.current) return;
    
    if (afterViewRef.current && viewMode === 'changes') {
      const contentToShow = showHighlights ? (highlightedData?.html || editedContent) : editedContent;
      
      const currentContent = afterViewRef.current.innerHTML.trim().replace(/\s+/g, ' ');
      const newContent = contentToShow.trim().replace(/\s+/g, ' ');
      
      if (currentContent !== newContent) {
        isSyncingRef.current = true;
        
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const startOffset = range?.startOffset;
        const startContainer = range?.startContainer;
        
        afterViewRef.current.innerHTML = contentToShow;
        
        if (startContainer && startOffset !== undefined) {
          try {
            const newRange = document.createRange();
            newRange.setStart(startContainer, Math.min(startOffset, startContainer.textContent?.length || 0));
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (e) {}
        }
        
        setTimeout(() => { isSyncingRef.current = false; }, 100);
      }
    }
  }, [editedContent, viewMode, showHighlights, highlightedData]);

  const handleAfterViewInput = () => {
    if (isSyncingRef.current) return;
    
    if (afterViewRef.current) {
      const rawHTML = afterViewRef.current.innerHTML;
      const cleanedHTML = rawHTML.replace(
        /<div style="background-color: #e0f2fe; padding: 8px; margin: 8px 0; border-left: 3px solid #0ea5e9; border-radius: 4px;">(.*?)<\/div>/gs, 
        '$1'
      );
      setEditedContent(cleanedHTML);
    }
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
    
    if (!selectedText) {
      alert('Please select text first');
      return;
    }
    
    isUserEditingRef.current = true;
    isSyncingRef.current = true;
    
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
        
        setTimeout(() => {
          isUserEditingRef.current = false;
          isSyncingRef.current = false;
        }, 100);
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
    
    setTimeout(() => {
      isUserEditingRef.current = false;
      isSyncingRef.current = false;
    }, 100);
  };

  const formatHeading = (level) => {
    afterViewRef.current?.focus();
    
    isUserEditingRef.current = true;
    isSyncingRef.current = true;
    
    document.execCommand('formatBlock', false, `<h${level}>`);
    
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    
    setTimeout(() => {
      isUserEditingRef.current = false;
      isSyncingRef.current = false;
    }, 100);
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
    if (!linkUrl) {
      alert('Please enter a URL');
      return;
    }
    
    isUserEditingRef.current = true;
    isSyncingRef.current = true;
    
    if (editingLink) {
      editingLink.href = linkUrl;
      editingLink.target = '_blank';
      editingLink.rel = 'noopener noreferrer';
    } else {
      if (savedSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        
        const selectedText = selection.toString();
        
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#0ea5e9';
        link.style.textDecoration = 'underline';
        
        if (selectedText) {
          link.textContent = selectedText;
          savedSelection.deleteContents();
          savedSelection.insertNode(link);
          savedSelection.setStartAfter(link);
          savedSelection.collapse(true);
        } else {
          link.textContent = linkUrl;
          savedSelection.insertNode(link);
          savedSelection.setStartAfter(link);
          savedSelection.collapse(true);
        }
      } else {
        alert('No cursor position saved. Please click in the editor first.');
        isSyncingRef.current = false;
        isUserEditingRef.current = false;
        return;
      }
    }
    
    afterViewRef.current?.focus();
    
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    
    setTimeout(() => {
      isUserEditingRef.current = false;
      isSyncingRef.current = false;
    }, 100);
    
    setShowLinkModal(false);
    setLinkUrl('');
    setEditingLink(null);
  };

  const insertImage = () => {
    saveSelection();
    setShowImageModal(true);
  };

  const applyImage = async () => {
    isUserEditingRef.current = true;
    isSyncingRef.current = true;
    
    let imageSrc = '';
    
    if (imageFile) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = () => reject(new Error("Read failed"));
          r.readAsDataURL(imageFile);
        });
        imageSrc = base64;
      } catch (error) {
        console.error('Error reading image file:', error);
        alert('Failed to read image file');
        isSyncingRef.current = false;
        isUserEditingRef.current = false;
        return;
      }
    } else if (imageUrl) {
      imageSrc = imageUrl;
    } else {
      alert('Please select an image file or enter a URL');
      isSyncingRef.current = false;
      isUserEditingRef.current = false;
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
      selection.addRange(savedSelection);
      
      savedSelection.insertNode(img);
      savedSelection.setStartAfter(img);
      savedSelection.collapse(true);
    } else {
      afterViewRef.current?.appendChild(img);
    }
    
    if (afterViewRef.current) {
      setEditedContent(afterViewRef.current.innerHTML);
    }
    
    setTimeout(() => {
      isUserEditingRef.current = false;
      isSyncingRef.current = false;
    }, 100);
    
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
    isUserEditingRef.current = true;
    isSyncingRef.current = true;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(editedContent, 'text/html');
    const images = doc.querySelectorAll('img');
    
    if (images[imageAltModal.index]) {
      images[imageAltModal.index].setAttribute('alt', imageAltModal.currentAlt);
      const newContent = doc.body.innerHTML;
      setEditedContent(newContent);
    }
    
    setTimeout(() => {
      isUserEditingRef.current = false;
      isSyncingRef.current = false;
    }, 100);
    
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  const deleteImage = () => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    isUserEditingRef.current = true;
    isSyncingRef.current = true;
    
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
    }
    
    setTimeout(() => {
      isUserEditingRef.current = false;
      isSyncingRef.current = false;
    }, 100);
    
    setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 });
  };

  const processBlog = async () => {
    if (!selectedBlog) {
      setStatus({ type: 'error', message: '❌ No blog selected' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: '🔍 Processing blog...' });
    setResult(null);

    try {
      const blogType = detectBlogType(selectedBlog.fieldData.name);
      console.log('📊 Detected blog type:', blogType);

      let researchPrompt = BOFU_RESEARCH_PROMPT;
      if (blogType === 'TOFU') researchPrompt = TOFU_RESEARCH_PROMPT;
      if (blogType === 'MOFU') researchPrompt = MOFU_RESEARCH_PROMPT;

      console.log('🎯 Using research prompt for:', blogType);

      // Fetch actual blog content from Webflow
      setStatus({ type: 'info', message: '📥 Fetching blog content from Webflow...' });
      
      if (!config.webflowKey || !config.collectionId) {
        setStatus({ type: 'error', message: '❌ Webflow API key and Collection ID required. Please configure in Settings.' });
        setLoading(false);
        return;
      }

      const webflowResponse = await fetch(`https://api.webflow.com/v2/collections/${config.collectionId}/items/${selectedBlog.id}`, {
        headers: {
          'Authorization': `Bearer ${config.webflowKey}`,
          'accept': 'application/json'
        }
      });

      if (!webflowResponse.ok) {
        throw new Error(`Webflow API error: ${webflowResponse.status} - ${webflowResponse.statusText}`);
      }

      const webflowData = await webflowResponse.json();
      console.log('📦 Fetched blog from Webflow:', webflowData);

      const blogContent = webflowData.fieldData?.['post-body'] || 
                         webflowData.fieldData?.content || 
                         webflowData.fieldData?.body || '';
      
      if (!blogContent || blogContent.trim().length < 100) {
        setStatus({ type: 'error', message: '❌ Blog content is empty or too short in Webflow. Check the post-body field.' });
        setLoading(false);
        return;
      }

      console.log('📝 Blog content fetched, length:', blogContent.length, 'characters');

      setStatus({ type: 'info', message: '🔍 Step 1/2: Researching and fact-checking...' });

      const researchResponse = await fetch(`${BACKEND_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicKey: config.anthropicKey,
          braveKey: config.braveKey,
          content: blogContent,
          title: selectedBlog.fieldData.name,
          researchPrompt
        })
      });

      if (!researchResponse.ok) {
        throw new Error('Research failed');
      }

      const researchResult = await researchResponse.json();
      console.log('🔍 Research complete:', researchResult);

      setStatus({ type: 'info', message: '✍️ Step 2/2: Rewriting content...' });

      const rewriteResponse = await fetch(`${BACKEND_URL}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anthropicKey: config.anthropicKey,
          content: blogContent,
          researchFindings: researchResult.findings,
          writingPrompt: WRITING_PROMPT
        })
      });

      if (!rewriteResponse.ok) {
        throw new Error('Rewrite failed');
      }

      const rewriteResult = await rewriteResponse.json();
      console.log('✍️ Rewrite complete');

      setResult({
        originalContent: blogContent,
        rewrittenContent: rewriteResult.rewrittenContent,
        researchFindings: researchResult.findings,
        blogType
      });

      setEditedContent(rewriteResult.rewrittenContent);
      setStatus({ type: 'success', message: '✅ Processing complete!' });
      setViewMode('changes');

    } catch (error) {
      console.error('Processing error:', error);
      setStatus({ type: 'error', message: `❌ Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const publishToWebflow = async () => {
    if (!selectedBlog || !editedContent) {
      setStatus({ type: 'error', message: '❌ No content to publish' });
      return;
    }

    if (!confirm('Are you sure you want to publish this updated content to Webflow?')) {
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: '📤 Publishing to Webflow...' });

    try {
      const response = await fetch(`https://api.webflow.com/v2/collections/${config.collectionId}/items/${selectedBlog.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${config.webflowKey}`,
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          fieldData: {
            'post-body': editedContent
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Webflow API error: ${response.status}`);
      }

      setStatus({ type: 'success', message: '✅ Published to Webflow successfully!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error('Publish error:', error);
      setStatus({ type: 'error', message: `❌ Publish failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('contentops_config', JSON.stringify(config));
    setSavedConfig(config);
    setStatus({ type: 'success', message: '✅ Configuration saved!' });
    setTimeout(() => setStatus({ type: '', message: '' }), 2000);
  };

  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setView('home')}
            className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-8 h-8 text-gray-700" />
              <h2 className="text-3xl font-bold text-gray-900">Configuration</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Anthropic API Key
                </label>
                <input
                  type="password"
                  value={config.anthropicKey}
                  onChange={(e) => setConfig({ ...config, anthropicKey: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="sk-ant-..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brave Search API Key
                </label>
                <input
                  type="password"
                  value={config.braveKey}
                  onChange={(e) => setConfig({ ...config, braveKey: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BSA..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Webflow API Key
                </label>
                <input
                  type="password"
                  value={config.webflowKey}
                  onChange={(e) => setConfig({ ...config, webflowKey: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Webflow API Key"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Webflow Collection ID
                </label>
                <input
                  type="text"
                  value={config.collectionId}
                  onChange={(e) => setConfig({ ...config, collectionId: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Collection ID"
                />
              </div>

              <button
                onClick={saveConfig}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Save Configuration
              </button>

              {savedConfig && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Configuration saved successfully!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'process' && selectedBlog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => {
              setView('home');
              setSelectedBlog(null);
              setResult(null);
            }}
            className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Blogs
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedBlog.fieldData.name}</h2>
            {selectedBlog.fieldData['post-summary'] && (
              <p className="text-gray-600 mb-4">{selectedBlog.fieldData['post-summary']}</p>
            )}

            {!result ? (
              <button
                onClick={processBlog}
                disabled={loading || !savedConfig}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Zap className="w-5 h-5" />
                {loading ? 'Processing...' : 'Start Processing'}
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={publishToWebflow}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-semibold"
                >
                  <CheckCircle className="w-5 h-5" />
                  Publish to Webflow
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setEditedContent('');
                  }}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {status.message && (
            <div className={`mb-6 p-4 rounded-lg ${
              status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              status.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                {loading && <Loader className="w-5 h-5 animate-spin" />}
                {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
                <span className="font-medium">{status.message}</span>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setViewMode('changes')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        viewMode === 'changes'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Eye className="w-4 h-4 inline mr-2" />
                      Changes View
                    </button>
                    <button
                      onClick={() => setViewMode('original')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        viewMode === 'original'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Original
                    </button>
                  </div>

                  {viewMode === 'changes' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showHighlights}
                        onChange={(e) => setShowHighlights(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700">Show highlights</span>
                    </label>
                  )}
                </div>

                {viewMode === 'changes' && (
                  <>
                    <div className="mb-4 flex gap-2 flex-wrap">
                      <button onClick={() => formatText('bold')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button onClick={() => formatText('italic')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <Italic className="w-4 h-4" />
                      </button>
                      <button onClick={() => formatHeading(1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <Heading1 className="w-4 h-4" />
                      </button>
                      <button onClick={() => formatHeading(2)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <Heading2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => formatHeading(3)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <Heading3 className="w-4 h-4" />
                      </button>
                      <button onClick={insertLink} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <LinkIcon className="w-4 h-4" />
                      </button>
                      <button onClick={insertImage} className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div
                      ref={afterViewRef}
                      contentEditable
                      onInput={handleAfterViewInput}
                      onClick={handleContentClick}
                      className="prose max-w-none p-6 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[400px]"
                      style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    />
                  </>
                )}

                {viewMode === 'original' && (
                  <div className="prose max-w-none p-6 bg-gray-50 rounded-lg">
                    <div dangerouslySetInnerHTML={{ __html: result.originalContent }} />
                  </div>
                )}
              </div>

              {result.researchFindings && (
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Research Findings</h3>
                  <div className="prose max-w-none">
                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                      {JSON.stringify(result.researchFindings, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showLinkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">
                {editingLink ? 'Edit Link' : 'Insert Link'}
              </h3>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={applyLink}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingLink ? 'Update' : 'Insert'}
                </button>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkUrl('');
                    setEditingLink(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Insert Image</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-center text-gray-500">OR</div>
                <div>
                  <label className="block text-sm font-medium mb-2">Upload File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={applyImage}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Insert
                </button>
                <button
                  onClick={() => {
                    setShowImageModal(false);
                    setImageUrl('');
                    setImageFile(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {imageAltModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Image Settings</h3>
              <img src={imageAltModal.src} alt="" className="max-w-full h-auto mb-4 rounded" />
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Alt Text</label>
                <input
                  type="text"
                  value={imageAltModal.currentAlt}
                  onChange={(e) => setImageAltModal({ ...imageAltModal, currentAlt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={updateImageAlt}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={deleteImage}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setImageAltModal({ show: false, src: '', currentAlt: '', index: -1 })}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">ContentOps Dashboard</h1>
            <p className="text-gray-600 mt-2">AI-powered blog research and rewriting platform</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadBlogsFromCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh CSV
            </button>
            <button
              onClick={() => setView('settings')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>

        {status.message && (
          <div className={`mb-6 p-4 rounded-lg ${
            status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            status.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {status.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{status.message}</span>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 mb-8 border border-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Blog Library</h2>
                  <p className="text-gray-600">Loaded from repository CSV file</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">{blogs.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Blogs</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-3xl font-bold text-green-600">{filteredBlogs.length}</div>
                  <div className="text-sm text-gray-600 mt-1">Filtered Results</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-3xl font-bold text-purple-600">CSV</div>
                  <div className="text-sm text-gray-600 mt-1">Data Source</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search blogs by title, description, or ID..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => (
            <div 
              key={blog.id}
              onClick={() => {
                setSelectedBlog(blog);
                setView('process');
              }}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200 hover:border-blue-400 group"
            >
              <div className="flex items-start gap-4">
                {blog.fieldData['main-image'] || blog.fieldData.featuredImageUrl ? (
                  <img 
                    src={blog.fieldData['main-image'] || blog.fieldData.featuredImageUrl}
                    alt={blog.fieldData.name}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-10 h-10 text-blue-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                    {blog.fieldData.name}
                  </h3>
                  {blog.fieldData['post-summary'] && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {blog.fieldData['post-summary']}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {blog.fieldData.category && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                        {blog.fieldData.category}
                      </span>
                    )}
                    {blog.fieldData.status && (
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        blog.fieldData.status.toLowerCase() === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {blog.fieldData.status}
                      </span>
                    )}
                    {blog.fieldData.wordCount && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {blog.fieldData.wordCount} words
                      </span>
                    )}
                    {blog.fieldData.datePublished && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                        {new Date(blog.fieldData.datePublished).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredBlogs.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No blogs found</h3>
            <p className="text-gray-500">Try adjusting your search or refresh the CSV data</p>
          </div>
        )}
      </div>
    </div>
  );
}
