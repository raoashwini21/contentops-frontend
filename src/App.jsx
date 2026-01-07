import React, { useState, useEffect } from 'react';
import { Zap, Settings, RefreshCw, CheckCircle, AlertCircle, Loader, TrendingUp, Search, Sparkles } from 'lucide-react';

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
NEVER USE: Em-dashes, banned words (transform, delve, unleash, revolutionize, meticulous, navigating, realm, bespoke, tailored, autopilot, magic), sentences over 30 words
ALWAYS USE: Contractions, active voice, short sentences (15-20 words), direct address, bold for key points

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
4. Preserve structure: Keep original HTML formatting, maintain headings/lists, keep images/links
5. Add TL;DR if missing at the very start: 3-4 sentences covering main points

**CRITICAL: Return the COMPLETE HTML content. Do not truncate or summarize. Return every single paragraph, heading, and section from the original with your edits applied.**

Return only the complete rewritten HTML content.`;

// Extract changed sections for side-by-side comparison
const extractChangedSections = (originalHTML, updatedHTML) => {
  const stripHTML = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  
  // Extract all block elements
  const originalBlocks = originalHTML.match(/<p[^>]*>.*?<\/p>|<h[1-6][^>]*>.*?<\/h[1-6]>|<li[^>]*>.*?<\/li>|<ul[^>]*>.*?<\/ul>|<ol[^>]*>.*?<\/ol>|<figure[^>]*>.*?<\/figure>|<div[^>]*>.*?<\/div>/gi) || [];
  const updatedBlocks = updatedHTML.match(/<p[^>]*>.*?<\/p>|<h[1-6][^>]*>.*?<\/h[1-6]>|<li[^>]*>.*?<\/li>|<ul[^>]*>.*?<\/ul>|<ol[^>]*>.*?<\/ol>|<figure[^>]*>.*?<\/figure>|<div[^>]*>.*?<\/div>/gi) || [];
  
  const changes = [];
  const originalMap = new Map();
  
  // Map original blocks by cleaned content
  originalBlocks.forEach((block, idx) => {
    const cleaned = stripHTML(block);
    if (cleaned) {
      originalMap.set(cleaned, { html: block, index: idx });
    }
  });
  
  let changesCount = 0;
  
  // Find changed blocks
  updatedBlocks.forEach((updatedBlock, idx) => {
    const cleanedUpdated = stripHTML(updatedBlock);
    const match = originalMap.get(cleanedUpdated);
    
    if (!match) {
      // This block was changed or is new
      // Find closest original block by index
      let originalBlock = originalBlocks[idx] || originalBlocks[Math.min(idx, originalBlocks.length - 1)];
      
      // Check if this is genuinely different
      const cleanedOriginal = stripHTML(originalBlock);
      if (cleanedOriginal !== cleanedUpdated) {
        changes.push({
          before: originalBlock,
          after: updatedBlock,
          index: idx,
          type: 'modified'
        });
        changesCount++;
      }
    }
  });
  
  return { changes, changesCount };
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
  const [viewMode, setViewMode] = useState('changes'); // 'changes', 'full'
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [changedSections, setChangedSections] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('contentops_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedConfig(parsed);
      setConfig(parsed);
    }
  }, []);

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
    const originalCharCount = fullOriginalContent.length;
    
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
      
      const returnedCharCount = updatedContent.length;
      const truncationThreshold = 0.7;
      
      if (returnedCharCount < originalCharCount * truncationThreshold) {
        console.warn(`⚠️ Backend may have truncated content. Original: ${originalCharCount} chars, Returned: ${returnedCharCount} chars`);
        setStatus({ 
          type: 'error', 
          message: `⚠️ Backend returned incomplete content (${Math.round(returnedCharCount/originalCharCount*100)}% of original). Using original content. Check backend token limits.` 
        });
        updatedContent = fullOriginalContent;
      }
      
      const sections = extractChangedSections(fullOriginalContent, updatedContent);
      setChangedSections(sections);
      
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
          : `✅ Complete! ${data.searchesUsed} searches, ${data.claudeCalls} rewrites, ${sections.changesCount} changes, ${(data.duration/1000).toFixed(1)}s` 
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <nav className="bg-black bg-opacity-30 backdrop-blur-xl border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/50">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">ContentOps</span>
            </div>
            <div className="flex items-center gap-4">
              {savedConfig && (
                <>
                  <button onClick={() => setView('dashboard')} className="text-pink-300 hover:text-pink-200 font-medium">Dashboard</button>
                  <button onClick={() => setView('setup')} className="text-pink-300 hover:text-pink-200"><Settings className="w-5 h-5" /></button>
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
              <div className="inline-block px-4 py-2 bg-pink-500 bg-opacity-20 rounded-full border border-pink-500 border-opacity-30 mb-6">
                <span className="text-pink-300 text-sm font-semibold">Powered by Brave Search + Claude AI</span>
              </div>
              <h1 className="text-6xl font-bold text-white mb-4">Smart Content<br /><span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Fact-Checking</span></h1>
              <p className="text-xl text-purple-200 mb-3">Pure Brave research • AI-powered rewrites • Side-by-side diff view</p>
              <p className="text-sm text-purple-300">15-20 second checks • See only what changed</p>
            </div>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-bold hover:from-pink-600 hover:to-purple-700 shadow-2xl shadow-pink-500/50">
              {savedConfig ? 'Go to Dashboard →' : 'Get Started →'}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              {[
                { icon: <Search className="w-8 h-8" />, title: 'Pure Brave Research', desc: 'Stage 1: Direct Brave API searches (no Claude costs)' },
                { icon: <Zap className="w-8 h-8" />, title: 'Smart Rewrites', desc: 'Stage 2: Claude fixes errors, adds features, improves grammar' },
                { icon: <TrendingUp className="w-8 h-8" />, title: 'Side-by-Side Diff', desc: 'See ONLY changed sections: before vs after' }
              ].map((f, i) => (
                <div key={i} className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto text-white shadow-lg shadow-pink-500/30">{f.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-purple-200 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'setup' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-10">
              <h2 className="text-3xl font-bold text-white mb-6">Team Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">Claude API Key</label>
                  <input type="password" value={config.anthropicKey} onChange={(e) => setConfig({...config, anthropicKey: e.target.value})} placeholder="sk-ant-..." className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  <p className="text-xs text-purple-300 mt-1">Used for Stage 2: Content rewriting only</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">Brave Search API Key</label>
                  <input type="password" value={config.braveKey} onChange={(e) => setConfig({...config, braveKey: e.target.value})} placeholder="BSA..." className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                  <p className="text-xs text-purple-300 mt-1">Used for Stage 1: Pure research (2000 free/month)</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">Webflow API Token</label>
                  <input type="password" value={config.webflowKey} onChange={(e) => setConfig({...config, webflowKey: e.target.value})} placeholder="Your Webflow token" className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-purple-200 mb-2">Collection ID</label>
                  <input type="text" value={config.collectionId} onChange={(e) => setConfig({...config, collectionId: e.target.value})} placeholder="From Webflow CMS" className="w-full bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                </div>
                <button onClick={saveConfig} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 shadow-lg shadow-pink-500/50">
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
              {status.message && (
                <div className={`mt-4 p-4 rounded-lg ${status.type === 'error' ? 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30' : 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30'}`}>
                  <p className="text-white text-sm">{status.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white">Your Blog Posts</h2>
                <p className="text-purple-300 text-sm mt-1">Click to analyze: Brave Research → Claude Rewrite → Side-by-Side Diff</p>
              </div>
              <button onClick={fetchBlogs} disabled={loading} className="bg-white bg-opacity-10 text-pink-300 px-4 py-2 rounded-lg flex items-center gap-2 border border-white border-opacity-20 hover:bg-opacity-20">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
                <p className="text-purple-200">Loading...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map(blog => (
                  <div key={blog.id} className="bg-white bg-opacity-5 backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-10 hover:border-opacity-30 transition-all group
