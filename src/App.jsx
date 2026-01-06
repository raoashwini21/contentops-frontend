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

Return only the complete rewritten HTML content.`;

export default function ContentOps() {
  const [view, setView] = useState('home');
  const [config, setConfig] = useState({ anthropicKey: '', braveKey: '', webflowKey: '', collectionId: '' });
  const [savedConfig, setSavedConfig] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [result, setResult] = useState(null);
  const [showBefore, setShowBefore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [changeLocations, setChangeLocations] = useState([]);

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

  const findChanges = (originalContent, updatedContent) => {
    // Detailed function to show before/after comparisons
    const changes = [];
    
    // Extract all content blocks (headings, paragraphs, lists)
    const extractSections = (html) => {
      const headings = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
      const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gi) || [];
      const lists = html.match(/<li[^>]*>.*?<\/li>/gi) || [];
      return [...headings, ...paragraphs, ...lists];
    };
    
    const originalSections = extractSections(originalContent);
    const updatedSections = extractSections(updatedContent);
    
    // Compare each section
    const maxSections = Math.max(originalSections.length, updatedSections.length);
    
    for (let i = 0; i < maxSections; i++) {
      const originalSection = originalSections[i] || '';
      const updatedSection = updatedSections[i] || '';
      
      const cleanOriginal = originalSection.replace(/<[^>]*>/g, '').trim();
      const cleanUpdated = updatedSection.replace(/<[^>]*>/g, '').trim();
      
      // Skip if sections are identical or too short
      if (cleanUpdated === cleanOriginal || cleanUpdated.length < 20) continue;
      
      // Determine section type
      const isHeading = updatedSection.match(/<h[1-6]/i);
      const isList = updatedSection.match(/<li/i);
      
      let sectionType = 'Paragraph';
      if (isHeading) sectionType = 'Heading';
      if (isList) sectionType = 'List Item';
      
      // Determine change type
      let changeType = 'Modified';
      if (!cleanOriginal) changeType = 'Added';
      if (!cleanUpdated) changeType = 'Removed';
      
      changes.push({
        location: `${sectionType} ${i + 1}`,
        type: changeType,
        before: cleanOriginal.substring(0, 150) + (cleanOriginal.length > 150 ? '...' : ''),
        after: cleanUpdated.substring(0, 150) + (cleanUpdated.length > 150 ? '...' : '')
      });
    }
    
    return changes.slice(0, 30); // Show up to 30 changes
  };

  const analyzeBlog = async (blog) => {
    setSelectedBlog(blog);
    setLoading(true);
    setStatus({ type: 'info', message: 'Smart analysis in progress (15-20s)...' });
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blogContent: blog.fieldData['post-body'] || '',
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
      const locations = findChanges(blog.fieldData['post-body'] || '', data.content || blog.fieldData['post-body']);
      setResult({
        changes: data.changes || [],
        searchesUsed: data.searchesUsed || 0,
        claudeCalls: data.claudeCalls || 0,
        sectionsUpdated: data.sectionsUpdated || 0,
        content: data.content || blog.fieldData['post-body'],
        originalContent: blog.fieldData['post-body'] || '',
        duration: data.duration || 0
      });
      setChangeLocations(locations);
      setEditedContent(data.content || blog.fieldData['post-body']);
      setStatus({ type: 'success', message: `✅ Complete! ${data.searchesUsed} searches, ${data.claudeCalls} rewrites, ${(data.duration/1000).toFixed(1)}s` });
      setView('review');
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
              <p className="text-xl text-purple-200 mb-3">Pure Brave research • AI-powered rewrites • Change tracking</p>
              <p className="text-sm text-purple-300">15-20 second checks • 50% cheaper (Brave only for research)</p>
            </div>
            <button onClick={() => setView(savedConfig ? 'dashboard' : 'setup')} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-10 py-4 rounded-xl text-lg font-bold hover:from-pink-600 hover:to-purple-700 shadow-2xl shadow-pink-500/50">
              {savedConfig ? 'Go to Dashboard →' : 'Get Started →'}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              {[
                { icon: <Search className="w-8 h-8" />, title: 'Pure Brave Research', desc: 'Stage 1: Direct Brave API searches (no Claude costs)' },
                { icon: <Zap className="w-8 h-8" />, title: 'Smart Rewrites', desc: 'Stage 2: Claude fixes errors, adds features, improves grammar' },
                { icon: <TrendingUp className="w-8 h-8" />, title: 'Change Tracking', desc: 'See exactly which sections were modified' }
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
                <p className="text-purple-300 text-sm mt-1">Click to analyze: Brave Research → Claude Rewrite</p>
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
                  <div key={blog.id} className="bg-white bg-opacity-5 backdrop-blur-lg rounded-xl p-6 border border-white border-opacity-10 hover:border-opacity-30 transition-all group">
                    <h3 className="font-semibold text-white mb-2 line-clamp-2">{blog.fieldData.name}</h3>
                    <p className="text-sm text-purple-200 mb-4 line-clamp-3">{blog.fieldData['post-summary'] || 'No description'}</p>
                    <button onClick={() => analyzeBlog(blog)} disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 shadow-lg shadow-pink-500/30 group-hover:shadow-pink-500/50">
                      {loading && selectedBlog?.id === blog.id ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '⚡ Smart Check'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {status.message && (
              <div className={`mt-6 p-4 rounded-lg flex items-center gap-2 ${status.type === 'error' ? 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30' : 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30'}`}>
                {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-300" />}
                {status.type === 'success' && <CheckCircle className="w-5 h-5 text-green-300" />}
                {status.type === 'info' && <Loader className="w-5 h-5 text-blue-300 animate-spin" />}
                <p className="text-white text-sm">{status.message}</p>
              </div>
            )}
          </div>
        )}

        {view === 'review' && result && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-2">✅ Analysis Complete!</h2>
              <p className="text-green-100">{result.searchesUsed} Brave searches • {result.claudeCalls} Claude rewrite • {result.sectionsUpdated} updates</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-5 rounded-lg p-4 border border-white border-opacity-10">
                <div className="text-purple-300 text-sm">🔍 Brave Searches</div>
                <div className="text-white text-2xl font-bold">{result.searchesUsed}</div>
              </div>
              <div className="bg-white bg-opacity-5 rounded-lg p-4 border border-white border-opacity-10">
                <div className="text-purple-300 text-sm">✏️ Claude Rewrites</div>
                <div className="text-white text-2xl font-bold">{result.claudeCalls}</div>
              </div>
              <div className="bg-white bg-opacity-5 rounded-lg p-4 border border-white border-opacity-10">
                <div className="text-purple-300 text-sm">⚡ Speed</div>
                <div className="text-white text-2xl font-bold">{(result.duration/1000).toFixed(1)}s</div>
              </div>
            </div>
            <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">📍 What Claude Rewrote:</h3>
                {changeLocations.length > 10 && (
                  <span className="text-purple-300 text-sm">{changeLocations.length} changes • scroll to see all</span>
                )}
              </div>
              {changeLocations.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {changeLocations.map((change, i) => (
                    <div key={i} className="bg-white bg-opacity-5 rounded-lg p-5 border border-white border-opacity-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-purple-500 bg-opacity-30 text-purple-200 text-xs font-semibold rounded">
                          {change.location}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          change.type === 'Modified' 
                            ? 'bg-yellow-500 bg-opacity-30 text-yellow-200' 
                            : change.type === 'Added'
                            ? 'bg-green-500 bg-opacity-30 text-green-200'
                            : 'bg-red-500 bg-opacity-30 text-red-200'
                        }`}>
                          {change.type}
                        </span>
                      </div>
                      {change.type === 'Modified' && (
                        <div className="space-y-2">
                          <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded p-3">
                            <p className="text-red-200 text-xs font-semibold mb-1">BEFORE:</p>
                            <p className="text-purple-100 text-sm">{change.before}</p>
                          </div>
                          <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-20 rounded p-3">
                            <p className="text-green-200 text-xs font-semibold mb-1">AFTER:</p>
                            <p className="text-purple-100 text-sm">{change.after}</p>
                          </div>
                        </div>
                      )}
                      {change.type === 'Added' && (
                        <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-20 rounded p-3">
                          <p className="text-green-200 text-xs font-semibold mb-1">NEW CONTENT:</p>
                          <p className="text-purple-100 text-sm">{change.after}</p>
                        </div>
                      )}
                      {change.type === 'Removed' && (
                        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded p-3">
                          <p className="text-red-200 text-xs font-semibold mb-1">REMOVED:</p>
                          <p className="text-purple-100 text-sm">{change.before}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white bg-opacity-5 rounded-lg p-4 border border-white border-opacity-10">
                  <p className="text-purple-300">No structural changes detected - content appears identical or only minor formatting updates.</p>
                </div>
              )}
            </div>

            <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-10">
              <h3 className="text-2xl font-bold text-white mb-4">📝 Summary of Updates:</h3>
              <p className="text-purple-200 text-sm mb-4">High-level overview of what was fact-checked and rewritten:</p>
              {result.changes.length > 0 ? (
                <ul className="space-y-2">
                  {result.changes.map((change, i) => (
                    <li key={i} className="text-purple-100 flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-purple-300">No updates needed - content is current!</p>
              )}
            </div>
            <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">📄 Content Preview:</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowBefore(!showBefore)} className="bg-white bg-opacity-10 hover:bg-opacity-20 text-purple-300 px-4 py-2 rounded-lg text-sm font-semibold border border-white border-opacity-20 transition-all">
                    {showBefore ? '✨ Show After' : '⏮️ Show Before'}
                  </button>
                  {!showBefore && (
                    <button onClick={() => { setIsEditing(!isEditing); if (!isEditing) setEditedContent(result.content); }} className="bg-purple-500 bg-opacity-20 hover:bg-opacity-30 text-purple-200 px-4 py-2 rounded-lg text-sm font-semibold border border-purple-500 border-opacity-30 transition-all">
                      {isEditing ? '👁️ Preview' : '✏️ Edit HTML'}
                    </button>
                  )}
                </div>
              </div>
              
              {isEditing ? (
                <div className="bg-gray-900 rounded-lg p-4 shadow-2xl">
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[700px] bg-gray-800 text-gray-100 font-mono text-sm p-4 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Edit HTML content here..."
                  />
                  <div className="mt-3 px-4 py-2 bg-purple-500 bg-opacity-20 border border-purple-500 border-opacity-30 rounded-lg">
                    <p className="text-purple-200 text-sm">✏️ Editing mode: You can modify the HTML directly. Click "Preview" to see changes.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="bg-white rounded-lg p-8 shadow-2xl overflow-y-auto" 
                    style={{ maxHeight: '800px' }}
                  >
                    <div 
                      className="prose prose-lg max-w-none text-gray-800" 
                      style={{ 
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
                        lineHeight: '1.7',
                        fontSize: '16px'
                      }} 
                      dangerouslySetInnerHTML={{ __html: showBefore ? result.originalContent : editedContent }} 
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    {showBefore ? (
                      <div className="px-4 py-2 bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg">
                        <p className="text-yellow-200 text-sm">👆 ORIGINAL content from Webflow (scroll to see full blog)</p>
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg">
                        <p className="text-green-200 text-sm">✨ UPDATED content (scroll to see full blog • click Edit HTML to modify)</p>
                      </div>
                    )}
                    <div className="text-purple-300 text-sm">{Math.round(editedContent.length / 1000)}K chars • {editedContent.split(/<p[^>]*>/).length - 1} paragraphs</div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setView('dashboard')} className="flex-1 bg-white bg-opacity-10 text-purple-300 py-4 rounded-xl font-semibold hover:bg-opacity-20 border border-white border-opacity-20">← Cancel</button>
              <button onClick={publishToWebflow} disabled={loading} className="flex-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-8 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl shadow-green-500/50">
                {loading ? <><Loader className="w-5 h-5 animate-spin" />Publishing...</> : <><CheckCircle className="w-5 h-5" />Publish to Webflow</>}
              </button>
            </div>
            {status.message && (
              <div className={`p-4 rounded-lg ${status.type === 'error' ? 'bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30' : 'bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30'}`}>
                <p className="text-white text-sm">{status.message}</p>
              </div>
            )}
          </div>
        )}

        {view === 'success' && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Published!</h2>
            <p className="text-purple-200 mb-8">Content updated on Webflow</p>
            <button onClick={() => { setView('dashboard'); setResult(null); setSelectedBlog(null); }} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 shadow-2xl shadow-pink-500/50">
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>

      <footer className="bg-black bg-opacity-30 border-t border-white border-opacity-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-purple-200 text-sm">
          <p>🔒 All API keys stored securely in your browser</p>
          <p className="mt-2 text-purple-300">ContentOps • Brave Research → Claude Writing</p>
        </div>
      </footer>
    </div>
  );
}
