// Simple client-side router
export class Router {
    constructor() {
        this.routes = {};
        this.currentPage = null;
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // Handle initial load
        this.handleRoute();
    }
    
    // Register a route
    addRoute(path, handler) {
        this.routes[path] = handler;
    }
    
    // Handle route changes
    async handleRoute() {
        // Get current hash or default to home
        const hash = window.location.hash.slice(1) || '/';
        
        // Find matching route
        const handler = this.routes[hash] || this.routes['/'];
        
        if (handler) {
            // Update active nav link
            this.updateActiveNav(hash);
            
            // Call the route handler
            await handler();
            this.currentPage = hash;
        }
    }
    
    // Update active navigation link
    updateActiveNav(currentPath) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            const page = link.getAttribute('data-page');
            const linkPath = link.getAttribute('href').slice(1);
            
            if (linkPath === currentPath || (currentPath === '/' && page === 'home')) {
                link.classList.add('active');
            }
        });
    }
    
    // Navigate to a specific route
    navigate(path) {
        window.location.hash = path;
    }
}