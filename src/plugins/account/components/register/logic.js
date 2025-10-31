import { common } from '@utils/common';
import { storage } from '@utils/storage';
import { form } from '@utils/form';

// Toggle password visibility
function togglePasswordVisibility(event) 
{
    const input = event.target.closest('.c-input')?.querySelector('input');

    if (input && input.type === 'password') 
    {
        input.type = 'text';
    } 
    else if (input) 
    {
        input.type = 'password';
    }
}

// Handle form submission
function handleSubmit(event, fields, response, success) 
{
    if (!success) 
    {
        return;
    }

    // Store the token
    storage.set('token', response.data.token, true);
    
    // Check if user registered via email (needs verification)
    const user = response.data.user;
    
    if (user && !user.email_verified) 
    {
        // Show notification about verification
        common.notification('Registration successful! Please check your email to verify your account.', true);
    }
    
    // Always redirect to survey (no strict enforcement)
    window.location.href = '/survey';
}

export 
{
    togglePasswordVisibility,
    handleSubmit
}