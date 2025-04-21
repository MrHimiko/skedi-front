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
    
    // Get return URL or default to homepage
    const url = (common.query('return') ?? '/events');
    
    // Navigate to the return URL or homepage
    window.location.href = url.startsWith('/') ? url : '/';
}

export 
{
    togglePasswordVisibility,
    handleSubmit
}