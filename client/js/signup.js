// Sign up page
import { signUp } from '../api.js';

export function renderSignUpPage() {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="signin-section">
            <div class="card">
                <div class="card-header">
                    <h2>Create Account</h2>
                </div>
                
                <form id="signup-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            required 
                            placeholder="Choose a username"
                            minlength="3"
                        >
                    </div>
                    
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
                        <label for="team-name">Team Name</label>
                        <input 
                            type="text" 
                            id="team-name" 
                            name="team-name" 
                            required 
                            placeholder="Your team name"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            required 
                            placeholder="Choose a password (min 6 characters)"
                            minlength="6"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm-password">Confirm Password</label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            name="confirm-password" 
                            required 
                            placeholder="Confirm your password"
                            minlength="6"
                        >
                    </div>
                    
                    <div id="error-message" style="color: red; margin-bottom: 1rem; display: none;"></div>
                    <div id="success-message" style="color: green; margin-bottom: 1rem; display: none;"></div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;">
                        Create Account
                    </button>
                </form>
                
                <div style="text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                    <p>Already have an account? <a href="#/signin" style="color: var(--primary-color); font-weight: 600;">Sign In</a></p>
                </div>
            </div>
        </div>
    `;
    
    // Add form submit handler
    document.getElementById('signup-form').addEventListener('submit', handleSignUp);
}

async function handleSignUp(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const teamName = document.getElementById('team-name').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Clear previous messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';
    
    try {
        await signUp(email, password, username, teamName);
        
        successDiv.textContent = 'Account created successfully! Signing you in...';
        successDiv.style.display = 'block';
        
        // Wait a moment then redirect
        setTimeout(() => {
            window.location.hash = '/';
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Sign up error:', error);
        errorDiv.textContent = error.message || 'Failed to create account. Please try again.';
        errorDiv.style.display = 'block';
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
}