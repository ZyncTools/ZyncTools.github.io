/**
 * ZyncTools — Chatbot Logic (Client-Side RAG)
 * Privacy-first assistant trained on tools-database.json and faq-knowledge-base.json
 */

(function () {
    'use strict';

    const ChatBot = {
        model: null,
        tokenizer: null,
        isMobile: false,
        isModelReady: false,
        faqData: [],
        toolsData: [],
        embeddings: [],
        initPromise: null,

        $: (sel) => document.querySelector(sel),
        $$: (sel) => Array.from(document.querySelectorAll(sel)),

        async init() {
            if (this.initPromise) return this.initPromise;
            this.initPromise = this._init();
            return this.initPromise;
        },

        async _init() {
            this.detectDevice();

            try {
                const [faqRes, toolsRes] = await Promise.all([
                    fetch('/knowledge-base.json', { cache: 'no-store' }),
                    fetch('/tools-database.json', { cache: 'no-store' })
                ]);

                if (faqRes.ok) {
                    const faq = await faqRes.json();
                    this.faqData = (faq.qa || []).map(item => ({
                        ...item,
                        text: `${item.question} ${item.answer || ''}`.toLowerCase()
                    }));
                }

                if (toolsRes.ok) {
                    const db = await toolsRes.json();
                    this.toolsData = (db.tools || []).map(t => ({
                        id: t.id,
                        name: t.name,
                        description: t.description || '',
                        category: t.category,
                        icon: t.icon || 'tool',
                        tags: (t.tags || []).join(' '),
                        text: `${t.name} ${t.description || ''} ${(t.tags || []).join(' ')}`.toLowerCase()
                    }));
                }

                if (!this.isMobile) {
                    await this.initSemanticSearch();
                }
            } catch (err) {
                console.warn('[ChatBot] Init warning:', err);
            }
        },

        detectDevice() {
            this.isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
                || window.innerWidth < 768;
        },

        async initSemanticSearch() {
            try {
                if (typeof window.Transformers === 'undefined' && typeof window.Xenova === 'undefined') {
                    await this.loadScript('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
                }

                const env = window.Transformers || window.Xenova;
                if (!env || !env.pipeline) {
                    console.warn('[ChatBot] Transformers library not available, using keyword mode.');
                    return;
                }

                this.model = await env.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                    quantized: true,
                    progress_callback: () => {}
                });

                this.isModelReady = true;
                await this.buildEmbeddings();
            } catch (err) {
                console.warn('[ChatBot] Semantic search unavailable, using keyword fallback:', err);
                this.isModelReady = false;
            }
        },

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },

        async buildEmbeddings() {
            if (!this.model) return;

            const docs = [...this.faqData.map(f => f.text), ...this.toolsData.map(t => t.text)];
            this.embeddings = [];

            for (const doc of docs) {
                try {
                    const output = await this.model(doc, { pooling: 'mean', normalize: true });
                    this.embeddings.push(Array.from(output.data || output));
                } catch {
                    this.embeddings.push(null);
                }
            }
        },

        cosineSimilarity(a, b) {
            if (!a || !b) return 0;
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < a.length; i++) {
                dot += a[i] * b[i];
                normA += a[i] * a[i];
                normB += b[i] * b[i];
            }
            return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
        },

        async semanticSearch(query, topK = 3) {
            if (!this.model || !this.isModelReady) return this.keywordSearch(query, topK);

            let queryEmbedding;
            try {
                const output = await this.model(query.toLowerCase(), { pooling: 'mean', normalize: true });
                queryEmbedding = Array.from(output.data || output);
            } catch {
                return this.keywordSearch(query, topK);
            }

            const scores = this.embeddings.map((emb, i) => ({
                index: i,
                score: this.cosineSimilarity(queryEmbedding, emb)
            }));

            scores.sort((a, b) => b.score - a.score);

            const results = [];
            const seen = new Set();

            for (const s of scores) {
                if (s.score < 0.25) break;
                const isFaq = s.index < this.faqData.length;
                const dataIndex = isFaq ? s.index : s.index - this.faqData.length;
                const source = isFaq ? this.faqData[dataIndex] : this.toolsData[dataIndex];

                if (!source || seen.has(source.question || source.id)) continue;
                seen.add(source.question || source.id);

                results.push({
                    source: isFaq ? 'faq' : 'tool',
                    score: s.score,
                    data: source
                });

                if (results.length >= topK) break;
            }

            return results;
        },

        keywordSearch(query, topK = 3) {
            const q = query.toLowerCase().replace(/[^\w\s]/g, '');
            const terms = q.split(/\s+/).filter(Boolean);
            if (terms.length === 0) return [];

            const scored = [];

            this.faqData.forEach((faq, i) => {
                const text = faq.text;
                let score = 0;
                terms.forEach(term => {
                    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    const matches = text.match(regex);
                    if (matches) score += matches.length * 2;
                });
                if (score > 0) scored.push({ source: 'faq', score, data: faq, index: i });
            });

            this.toolsData.forEach((tool, i) => {
                const text = tool.text;
                let score = 0;
                terms.forEach(term => {
                    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    const matches = text.match(regex);
                    if (matches) score += matches.length;
                });
                if (score > 0) scored.push({ source: 'tool', score, data: tool, index: i });
            });

            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, topK);
        },

        async query(userMessage) {
            if (!userMessage.trim()) return this.getGreeting();

            const isMobile = this.isMobile;
            const results = isMobile
                ? this.keywordSearch(userMessage, 4)
                : await this.semanticSearch(userMessage, 4);

            if (results.length === 0) {
                return this.getNoResultResponse(userMessage);
            }

            const topResult = results[0];

            if (topResult.source === 'faq' && topResult.score > 0.4) {
                return this.buildFaqResponse(topResult.data, results);
            }

            return this.buildToolResponse(results, userMessage);
        },

        buildFaqResponse(faq, allResults) {
            const toolCards = (faq.toolIds || [])
                .map(id => this.toolsData.find(t => t.id === id))
                .filter(Boolean);

            let extraTools = [];
            if (allResults.length > 1) {
                extraTools = allResults
                    .filter(r => r.source === 'tool')
                    .slice(0, 3)
                    .map(r => r.data)
                    .filter(t => !toolCards.find(c => c.id === t.id));
            }

            return {
                text: faq.answer,
                toolCards: [...toolCards, ...extraTools].slice(0, 4),
                confidence: 0.8
            };
        },

        buildToolResponse(results, query) {
            const uniqueTools = [];
            const seenIds = new Set();

            for (const r of results) {
                if (r.source === 'tool' && !seenIds.has(r.data.id)) {
                    seenIds.add(r.data.id);
                    uniqueTools.push(r.data);
                }
            }

            const toolNames = uniqueTools.slice(0, 3).map(t => `<strong>${this.escapeHtml(t.name)}</strong>`).join(', ');

            let responseText = '';
            if (uniqueTools.length === 1) {
                responseText = `I found a tool that might help: ${toolNames}. ${this.escapeHtml(uniqueTools[0].description || '')}`;
            } else if (uniqueTools.length > 1) {
                responseText = `Here are some tools that match your search: ${toolNames}. Click any card below to open it.`;
            } else {
                responseText = this.getNoResultResponse(query).text;
            }

            return {
                text: responseText,
                toolCards: uniqueTools.slice(0, 4),
                confidence: results[0] ? results[0].score : 0
            };
        },

        getGreeting() {
            return {
                text: "Hi! I'm the ZyncTools assistant. Ask me anything about our tools — for example, \"How do I compress a PNG?\" or \"Which tool converts MP4 to MP3?\"",
                toolCards: [],
                confidence: 1
            };
        },

        getNoResultResponse(query) {
            const q = query.toLowerCase();
            if (q.includes('upload') || q.includes('not working') || q.includes('error')) {
                return {
                    text: "I couldn't find a specific answer for that. Try refreshing the page, using a different browser, or check if your file format is supported. If the issue persists, visit our <a href='/pages/support.html' target='_blank'>Support page</a>.",
                    toolCards: [],
                    confidence: 0
                };
            }
            return {
                text: "I'm not sure about that one. Try searching in the search bar above, or browse our <a href='/#dashboard' target='_blank'>tool categories</a>. You can also ask about specific tools like \"compress PDF\" or \"remove background\".",
                toolCards: [],
                confidence: 0
            };
        },

        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },

        formatResponse(response) {
            return {
                text: response.text,
                toolCards: (response.toolCards || []).map(tool => ({
                    id: tool.id,
                    name: this.escapeHtml(tool.name),
                    description: this.escapeHtml(tool.description || ''),
                    icon: tool.icon || 'tool',
                    category: tool.category,
                    url: `/tool.html?id=${tool.id}`
                }))
            };
        }
    };

    window.ZyncChatBot = ChatBot;
})();
