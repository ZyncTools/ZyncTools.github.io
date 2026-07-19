/**
 * ZyncTools — Global AI Chatbot (Fuse.js + Rule-Based)
 * Uses Fuse.js for fuzzy search over tools-database-cleaned.json.
 * Delivers clickable tool cards inside chat bubbles.
 *
 * Namespace: window.ZyncGlobalChat
 */
(function () {
    'use strict';

    /* =========================================
       STATE & CONFIG
       ========================================= */
    const STATE_KEY = 'zync-global-chat-open';

    var Chat = {
        fuse: null,
        fuseTools: [],
        categories: [],
        isOpen: false,
        history: [],

        $: (sel) => document.querySelector(sel),
        $$: (sel) => Array.from(document.querySelectorAll(sel)),

        /* =========================================
           INIT
           ========================================= */
        init() {
            this.cacheDOM();
            this.bindEvents();
            this.loadKnowledgeBase();
            this.restoreOpenState();

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.postInit());
            } else {
                this.postInit();
            }
        },

        cacheDOM() {
            this.dom = {
                fab:       this.$('#chatbot-fab'),
                window:    this.$('#chatbot-window'),
                messages:  this.$('#chatbot-messages'),
                typing:    this.$('#chatbot-typing'),
                input:     this.$('#chatbot-input'),
                send:      this.$('#chatbot-send'),
                closeBtn:  this.$('#chatbot-close-btn'),
                openBtn:   this.$('#chatbot-fab')
            };
        },

        bindEvents() {
            if (this.dom.fab) {
                this.dom.fab.addEventListener('click', () => this.toggle());
            }
            if (this.dom.closeBtn) {
                this.dom.closeBtn.addEventListener('click', () => this.close());
            }
            if (this.dom.send) {
                this.dom.send.addEventListener('click', () => this.handleSend());
            }
            if (this.dom.input) {
                this.dom.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.handleSend();
                    }
                });
            }

            // Theme-aware window styling
            if (typeof window.ZyncTheme !== 'undefined' && window.ZyncTheme.onThemeChange) {
                window.ZyncTheme.onThemeChange((theme) => this.onThemeChange(theme));
            }
        },

        postInit() {
            if (this.dom.messages && this.dom.messages.children.length === 0) {
                this.addBotMessage("Hi! I'm the ZyncTools assistant. Ask me anything — for example, \"How do I compress a PNG?\" or \"Which tool converts MP4 to MP3?\"");
            }
        },

        /* =========================================
           KNOWLEDGE BASE LOADING
           ========================================= */
        async loadKnowledgeBase() {
            try {
                var res = await fetch('/tools-database-cleaned.json', { cache: 'no-store' });
                if (!res.ok) throw new Error('DB not available');
                var data = await res.json();

                this.categories = (data.categories || []).map(function (c) {
                    return { id: c.id, name: c.name, icon: c.icon || 'tool' };
                });

                var tools = (data.tools || []).filter(function (t) {
                    return t.status === 'active' || t.status === 'coming' || !t.status;
                });

                this.fuseTools = tools.map(function (t) {
                    return {
                        id: t.id,
                        name: t.name,
                        description: t.description || '',
                        category: t.category,
                        icon: t.icon || 'tool',
                        tags: (t.tags || []).join(' '),
                        status: t.status || 'active',
                        popular: !!t.popular,
                        _searchText: [t.name, t.description || '', (t.tags || []).join(' ')].join(' ').toLowerCase()
                    };
                });

                this.initFuse();
            } catch (err) {
                console.warn('[ZyncGlobalChat] Knowledge base load failed:', err);
                this.fuseTools = [];
            }
        },

        initFuse() {
            if (typeof Fuse === 'undefined') {
                console.warn('[ZyncGlobalChat] Fuse.js not loaded; falling back to keyword search.');
                this.fuse = null;
                return;
            }
            this.fuse = new Fuse(this.fuseTools, {
                keys: [
                    { name: 'name', weight: 0.40 },
                    { name: '_searchText', weight: 0.35 },
                    { name: 'tags', weight: 0.15 },
                    { name: 'category', weight: 0.10 }
                ],
                threshold: 0.35,
                includeScore: true,
                minMatchCharLength: 2,
                ignoreLocation: true
            });
        },

        /* =========================================
           SEARCH
           ========================================= */
        search(query, limit) {
            limit = limit || 4;
            var q = (query || '').trim();
            if (!q || q.length < 2) return [];

            if (this.fuse) {
                try {
                    var results = this.fuse.search(q, { limit: limit });
                    return results.map(function (r) {
                        return { tool: r.item, score: r.score || 0 };
                    });
                } catch (e) {
                    console.warn('[ZyncGlobalChat] Fuse search error, falling back:', e);
                }
            }

            // Fallback keyword search
            var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
            var scored = [];
            this.fuseTools.forEach(function (tool) {
                var text = tool._searchText;
                var score = 0;
                terms.forEach(function (term) {
                    var idx = text.indexOf(term);
                    if (idx !== -1) score += (idx === 0 ? 3 : 1);
                });
                if (score > 0) scored.push({ tool: tool, score: 1 / (score + 1) });
            });
            scored.sort(function (a, b) { return a.score - b.score; });
            return scored.slice(0, limit);
        },

        /* =========================================
           RESPONSE GENERATION (Rule-Based)
           ========================================= */
        generateResponse(userMessage) {
            var q = (userMessage || '').trim();
            var self = this;

            if (!q) {
                return {
                    text: "Type a question like \"compress image\" or \"merge PDF\" and I'll find the right tool.",
                    cards: []
                };
            }

            // Greeting detection
            if (/^(hi|hello|hey|greetings|howdy|yo)\b/.test(q.toLowerCase())) {
                return {
                    text: "Hey! I can help you find the right ZyncTools utility. Try asking: \"convert image format\", \"merge PDFs\", \"compress video\", or \"encrypt text\".",
                    cards: this.getSuggestedTools(q)
                };
            }

            // Detect intent keywords and fetch tools
            var results = this.search(q, 4);
            var matched = results.map(function (r) { return r.tool; });

            // Deduplicate by id
            var seen = new Set();
            var unique = [];
            matched.forEach(function (t) {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    unique.push(t);
                }
            });

            if (unique.length === 0) {
                return {
                    text: "I couldn't find a specific tool for that. Try rephrasing, or browse categories from the sidebar. You can also ask \"all image tools\" or \"PDF utilities\".",
                    cards: []
                };
            }

            var intro, actionPhrase;
            if (unique.length === 1) {
                intro = "I found a tool that might help:";
                actionPhrase = "Click below to open it.";
            } else {
                intro = "Here are some tools that match your search:";
                actionPhrase = "Click any card below to open it.";
            }

            var names = unique.slice(0, 3).map(function (t) { return t.name; }).join(', ');
            var text = intro + ' <strong>' + this.escapeHtml(names) + '</strong>. ' + actionPhrase;

            var cards = unique.slice(0, 4).map(function (t) {
                return {
                    id: t.id,
                    name: t.name,
                    description: t.description || '',
                    icon: t.icon,
                    category: t.category,
                    status: t.status,
                    url: '/tool.html?id=' + t.id
                };
            });

            return { text: text, cards: cards };
        },

        getSuggestedTools(query) {
            var results = this.search(query || 'popular', 3);
            return results.map(function (r) {
                var t = r.tool;
                return {
                    id: t.id,
                    name: t.name,
                    description: t.description || '',
                    icon: t.icon,
                    category: t.category,
                    status: t.status,
                    url: '/tool.html?id=' + t.id
                };
            });
        },

        /* =========================================
           CHAT UI — Message Rendering
           ========================================= */
        handleSend() {
            var input = this.dom.input;
            if (!input) return;
            var text = input.value.trim();
            if (!text) return;

            input.value = '';
            this.addUserMessage(text);
            this.showTyping(true);

            // Simulate async "thinking" for better UX
            var delay = 350 + Math.random() * 400;
            var self = this;
            setTimeout(function () {
                self.showTyping(false);
                var response = self.generateResponse(text);
                self.addBotMessage(response.text, response.cards);
            }, delay);
        },

        addUserMessage(text) {
            if (!this.dom.messages) return;
            var bubble = document.createElement('div');
            bubble.className = 'chat-message user fade-in';
            bubble.innerHTML = '<div class="chat-message-avatar">You</div>' +
                '<div class="chat-message-content">' + this.escapeHtml(text) + '</div>';
            this.dom.messages.appendChild(bubble);
            this.scrollToBottom();
        },

        addBotMessage(text, cards) {
            if (!this.dom.messages) return;
            var bubble = document.createElement('div');
            bubble.className = 'chat-message bot fade-in';
            var self = this;

            var cardsHtml = '';
            if (cards && cards.length > 0) {
                cardsHtml = '<div class="chat-tool-cards">' +
                    cards.map(function (card) {
                        var catName = '';
                        if (window.ZyncGlobalChat && window.ZyncGlobalChat.categories) {
                            var found = window.ZyncGlobalChat.categories.find(function (c) { return c.id === card.category; });
                            if (found) catName = found.name;
                        }
                        return '<a class="chat-tool-card" href="' + self.escapeHtml(card.url) + '" data-tool-id="' + self.escapeHtml(card.id) + '">' +
                            '<div class="chat-tool-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg></div>' +
                            '<div class="chat-tool-card-info">' +
                            '<div class="chat-tool-card-title">' + self.escapeHtml(card.name) + '</div>' +
                            '<div class="chat-tool-card-desc">' + self.escapeHtml(card.description) + '</div>' +
                            '</div>' +
                            '<div class="chat-tool-card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                            '</a>';
                    }).join('') +
                    '</div>';
            }

            bubble.innerHTML = '<div class="chat-message-avatar">Z</div>' +
                '<div class="chat-message-content">' + text + cardsHtml + '</div>';
            this.dom.messages.appendChild(bubble);
            this.scrollToBottom();
        },

        showTyping(visible) {
            if (!this.dom.typing) return;
            if (visible) {
                this.dom.typing.classList.add('visible');
                this.scrollToBottom();
            } else {
                this.dom.typing.classList.remove('visible');
            }
        },

        scrollToBottom() {
            if (!this.dom.messages) return;
            requestAnimationFrame(function () {
                this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
            }.bind(this));
        },

        /* =========================================
           OPEN / CLOSE / TOGGLE
           ========================================= */
        toggle() {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        },

        open() {
            this.isOpen = true;
            if (this.dom.window) this.dom.window.classList.add('open');
            if (this.dom.fab) this.dom.fab.classList.add('active');
            if (this.dom.input) {
                setTimeout(function () { this.dom.input.focus(); }.bind(this), 300);
            }
            this.saveOpenState(true);
        },

        close() {
            this.isOpen = false;
            if (this.dom.window) this.dom.window.classList.remove('open');
            if (this.dom.fab) this.dom.fab.classList.remove('active');
            this.saveOpenState(false);
        },

        saveOpenState(open) {
            try { sessionStorage.setItem(STATE_KEY, open ? '1' : '0'); } catch (e) { /* ignore */ }
        },

        restoreOpenState() {
            try {
                var val = sessionStorage.getItem(STATE_KEY);
                if (val === '1') {
                    var self = this;
                    setTimeout(function () { self.open(); }, 600);
                }
            } catch (e) { /* ignore */ }
        },

        onThemeChange(theme) {
            // Chat window adapts via CSS variables, but we can force a class refresh if needed
            if (this.dom.window) {
                this.dom.window.style.transition = 'opacity 0.2s ease';
            }
        },

        /* =========================================
           UTILITIES
           ========================================= */
        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    };

    window.ZyncGlobalChat = Chat;
})();
