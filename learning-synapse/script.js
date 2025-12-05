/**
 * Synapse Global Script
 * 
 * This file contains global JavaScript logic that runs alongside the React application.
 * It handles aesthetic initializations and global state monitoring.
 */

// Execute immediately when imported
(function() {
    // Log a stylized welcome message to the console
    console.log(
        "%c SYNAPSE %c Neural Interface Active ",
        "background: #7c3aed; color: white; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: 700; font-family: system-ui;",
        "background: #0f172a; color: #94a3b8; padding: 4px 8px; border-radius: 0 4px 4px 0; border: 1px solid #1e293b; font-family: monospace;"
    );

    // Add a class to the body to signal JS is fully loaded
    // This can be used in styles.css for entrance animations if needed
    if (document.body) {
        document.body.classList.add('js-active');
    }
})();

// Global error handler for unhandled promise rejections (e.g. API failures)
window.addEventListener('unhandledrejection', function(event) {
    console.warn('Synapse System Warning:', event.reason);
});