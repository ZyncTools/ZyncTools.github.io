/**
 * ZyncTools — Sidebar UI Controller
 *
 * Conditionally shows/hides History and Favorites tabs
 * based on user privacy consent.
 *
 * Namespace: window.ZyncSidebarUI
 */
(function () {
    'use strict';

    var HISTORY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var FAVORITE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    var LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    var EMPTY_HISTORY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    var HISTORY_EMPTY = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);">' + EMPTY_HISTORY_ICON + '<p style="font-size:0.85rem;margin-top:12px;">No history yet.</p><p style="font-size:0.75rem;margin-top:4px;">Start using tools to see them here.</p></div>';
    var FAVORITES_EMPTY = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);">' + FAVORITE_ICON + '<p style="font-size:0.85rem;margin-top:12px;">No favorites yet.</p><p style="font-size:0.75rem;margin-top:4px;">Click the heart icon on any tool to save it.</p></div>';

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getPrivacySettings() {
        if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.getSettings === 'function') {
            return window.ZyncPrivacy.getSettings();
        }
        return { historyEnabled: false, favoritesEnabled: false };
    }

    function isHistoryEnabled() {
        if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.isHistoryEnabled === 'function') {
            return window.ZyncPrivacy.isHistoryEnabled();
        }
        return false;
    }

    function isFavoritesEnabled() {
        if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.isFavoritesEnabled === 'function') {
            return window.ZyncPrivacy.isFavoritesEnabled();
        }
        return false;
    }

    /* =========================================
       SIDEBAR NAV ITEMS
       ========================================= */
    function renderSidebarNav() {
        var categoriesNav = document.querySelector('#sidebar-categories');
        if (!categoriesNav) return;

        var settings = getPrivacySettings();
        var historyEnabled = settings.historyEnabled;
        var favoritesEnabled = settings.favoritesEnabled;

        // Remove any existing history/favorites nav items
        document.querySelectorAll('[data-sidebar-section="history-favorites"]').forEach(function (el) {
            el.remove();
        });

        if (!historyEnabled && !favoritesEnabled) return;

        var section = document.createElement('div');
        section.setAttribute('data-sidebar-section', 'history-favorites');
        section.className = 'sidebar-section-label';
        section.textContent = 'Personal';
        categoriesNav.parentNode.insertBefore(section, categoriesNav.nextSibling);

        var nav = document.createElement('div');
        nav.className = 'sidebar-nav';
        nav.setAttribute('data-sidebar-section', 'history-favorites');

        if (historyEnabled) {
            var histLink = document.createElement('button');
            histLink.className = 'sidebar-link';
            histLink.setAttribute('data-sidebar-cat', 'history');
            histLink.innerHTML = HISTORY_ICON + 'History<span class="sidebar-link-count">0</span>';
            nav.appendChild(histLink);
        }

        if (favoritesEnabled) {
            var favLink = document.createElement('button');
            favLink.className = 'sidebar-link';
            favLink.setAttribute('data-sidebar-cat', 'favorites');
            favLink.innerHTML = FAVORITE_ICON + 'Favorites<span class="sidebar-link-count">0</span>';
            nav.appendChild(favLink);
        }

        categoriesNav.parentNode.insertBefore(nav, section.nextSibling);

        // Bind click handlers
        bindNavClicks(nav);
    }

    function bindNavClicks(container) {
        if (!container) return;
        container.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-sidebar-cat]');
            if (!btn) return;
            var cat = btn.getAttribute('data-sidebar-cat');
            if (cat === 'history') {
                renderHistoryPanel();
            } else if (cat === 'favorites') {
                renderFavoritesPanel();
            }
        });
    }

    /* =========================================
       HISTORY PANEL
       ========================================= */
    function renderHistoryPanel() {
        var container = document.getElementById('dashboard');
        if (!container) return;

        if (!isHistoryEnabled()) {
            container.innerHTML = renderLockedPanel('History is disabled for privacy. Enable it in Settings to track your tools.');
            return;
        }

        if (typeof window.ZyncDBManager !== 'undefined' && typeof window.ZyncDBManager.getRecentHistory === 'function') {
            window.ZyncDBManager.getRecentHistory(20).then(function (entries) {
                if (entries.length === 0) {
                    container.innerHTML = '<div class="panel"><div class="panel-body">' + HISTORY_EMPTY + '</div></div>';
                } else {
                    var html = '<div class="panel"><div class="panel-header"><h2 class="panel-title">History</h2><span class="panel-badge">' + entries.length + '</span></div><div class="panel-body"><div class="tools-grid">';
                    entries.forEach(function (entry) {
                        html += renderToolCard({ id: entry.toolId, name: entry.name, category: entry.category, icon: entry.icon, description: '', tags: [] }, '', true);
                    });
                    html += '</div></div></div>';
                    container.innerHTML = html;
                    window.ZyncApp && typeof window.ZyncApp.refreshLucide === 'function' && window.ZyncApp.refreshLucide();
                }
            }).catch(function () {
                container.innerHTML = '<div class="panel"><div class="panel-body">' + HISTORY_EMPTY + '</div></div>';
            });
        } else {
            container.innerHTML = '<div class="panel"><div class="panel-body">' + HISTORY_EMPTY + '</div></div>';
        }
    }

    /* =========================================
       FAVORITES PANEL
       ========================================= */
    function renderFavoritesPanel() {
        var container = document.getElementById('dashboard');
        if (!container) return;

        if (!isFavoritesEnabled()) {
            container.innerHTML = renderLockedPanel('Favorites are disabled. Enable them in Settings to save tools.');
            return;
        }

        if (typeof window.ZyncDBManager !== 'undefined' && typeof window.ZyncDBManager.getAllFavorites === 'function') {
            window.ZyncDBManager.getAllFavorites().then(function (favs) {
                if (favs.length === 0) {
                    container.innerHTML = '<div class="panel"><div class="panel-body">' + FAVORITES_EMPTY + '</div></div>';
                } else {
                    var html = '<div class="panel"><div class="panel-header"><h2 class="panel-title">Favorites</h2><span class="panel-badge">' + favs.length + '</span></div><div class="panel-body"><div class="tools-grid">';
                    favs.forEach(function (fav) {
                        html += renderToolCard({ id: fav.toolId, name: fav.name, category: fav.category, icon: fav.icon, description: '', tags: [] }, '', true);
                    });
                    html += '</div></div></div>';
                    container.innerHTML = html;
                    window.ZyncApp && typeof window.ZyncApp.refreshLucide === 'function' && window.ZyncApp.refreshLucide();
                }
            }).catch(function () {
                container.innerHTML = '<div class="panel"><div class="panel-body">' + FAVORITES_EMPTY + '</div></div>';
            });
        } else {
            container.innerHTML = '<div class="panel"><div class="panel-body">' + FAVORITES_EMPTY + '</div></div>';
        }
    }

    function renderLockedPanel(message) {
        return '<div class="panel"><div class="panel-body" style="text-align:center;padding:40px 24px;color:var(--text-muted);">' +
            '<div style="width:48px;height:48px;border-radius:50%;background:var(--bg-surface);border:1px solid var(--border-subtle);display:grid;place-items:center;margin:0 auto 16px;color:var(--text-muted);">' +
            LOCK_ICON +
            '</div>' +
            '<p style="font-size:0.9rem;font-weight:600;color:var(--text-primary);margin-bottom:6px;">Privacy Mode Active</p>' +
            '<p style="font-size:0.8rem;max-width:320px;margin:0 auto;">' + esc(message) + '</p>' +
            '<button class="hero-cta" style="margin-top:20px;" onclick="if(window.ZyncPrivacy)window.ZyncPrivacy.enableHistory().then(function(r){if(r)window.ZyncSidebarUI.refresh();});">Enable in Settings</button>' +
            '</div></div>';
    }

    function renderToolCard(tool, query, isHistory) {
        var iconName = tool.icon || 'tool';
        var statusClass = 'active';
        var statusLabel = isHistory ? 'Visited' : 'Active';

        return '<a href="/' + (tool.category === 'images' ? 'image-tool' : 'tool') + '.html?id=' + esc(tool.id) + '" class="tool-card" data-tool-id="' + esc(tool.id) + '">' +
            '<div class="tool-card-top">' +
                '<div class="tool-card-icon"><i data-lucide="' + esc(iconName) + '"></i></div>' +
                '<span class="tool-card-status ' + statusClass + '">' + statusLabel + '</span>' +
            '</div>' +
            '<div class="tool-card-title">' + esc(tool.name) + '</div>' +
            '<div class="tool-card-desc">' + esc(tool.description || '') + '</div>' +
        '</a>';
    }

    /* =========================================
       PUBLIC API
       ========================================= */
    function refresh() {
        renderSidebarNav();
    }

    window.ZyncSidebarUI = {
        refresh: refresh,
        renderSidebarNav: renderSidebarNav,
        renderHistoryPanel: renderHistoryPanel,
        renderFavoritesPanel: renderFavoritesPanel,
        isHistoryEnabled: isHistoryEnabled,
        isFavoritesEnabled: isFavoritesEnabled
    };

    // Refresh on privacy settings change
    if (typeof window.ZyncPrivacy !== 'undefined' && typeof window.ZyncPrivacy.onChange === 'function') {
        window.ZyncPrivacy.onChange(function () {
            renderSidebarNav();
        });
    }

    // Initial render
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderSidebarNav);
    } else {
        renderSidebarNav();
    }

})();
