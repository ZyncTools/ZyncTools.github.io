(function () {
    const REGISTRY_PATH = 'registry.json';
    let registry = null;

    async function loadRegistry() {
        if (registry) return registry;
        const res = await fetch(REGISTRY_PATH, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load registry.json');
        registry = await res.json();
        return registry;
    }

    function getToolById(id) {
        if (!registry) return null;
        return registry.tools.find(t => t.id === id) || null;
    }

    function getCategoryById(id) {
        if (!registry) return null;
        return registry.categories.find(c => c.id === id) || null;
    }

    function getAllTools() {
        return registry ? registry.tools : [];
    }

    function getAllCategories() {
        return registry ? registry.categories : [];
    }

    window.ZyncRegistry = {
        loadRegistry,
        getToolById,
        getCategoryById,
        getAllTools,
        getAllCategories
    };
})();
