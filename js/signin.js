// Sign in page
import { signIn } from '../api.js';
import { router } from '../main.js';

export function renderSignInPage() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="signin-section">
            <div class="card">
                <div class="card-header">
                    <h2>Sign In</h2>
                </div>
                
                <form id="signin-form">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            required 
                            placeholder="your@email.com"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            placeholder="Enter your password"
                            minlength="6"
                        >
                    </div>
                    
                    <div id="error-message" style="color: red; margin-bottom: 1rem; display: none;"></div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Sign In
                    </button>
                </form>
                
                <div style="text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                    <p>Don't have an account? <a href="#/signup" style="color: var(--primary-color); font-weight: 600;">Sign Up</a></p>
                </div>
            </div>
        </div>
    `;
    
    // Add form submit handler
    document.getElementById('signin-form').addEventListener('submit', handleSignIn);
}

async function handleSignIn(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';
    errorDiv.style.display = 'none';
    
    try {
        await signIn(email, password);
        
        // Redirect to home page
        window.location.hash = '/';
        window.location.reload(); // Reload to reinitialize with auth
        
    } catch (error) {
        console.error('Sign in error:', error);
        errorDiv.textContent = error.message || 'Failed to sign in. Please check your credentials.';
        errorDiv.style.display = 'block';
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
}