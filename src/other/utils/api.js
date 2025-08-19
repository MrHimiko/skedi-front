import axios from 'axios'
import { storage } from '@utils/storage'

export const api = 
{
    async send(type, endpoint, query = {}, data = {}, headers = {}) 
    {
        headers['authorization'] = 'Bearer ' + storage.get('token')

        if(type.toLowerCase() === 'put')
        {
            type = 'POST';
            headers['X-HTTP-Method-Override'] = 'PUT'
        }

        try 
        {
            const response = await axios(
            {
                method: type,
                url: '/api/' + endpoint,
                params: query,
                data: data,
                headers: headers,
            })

            if (response.data && response.data.success) 
            {
                return response.data
            } 
            else 
            {
                throw {
                    success: false,
                    message: response?.message ? response.message : "Unexpected response structure",
                    data: response.data
                }
            }
        } 
        catch (error) 
        {
            if (axios.isAxiosError(error)) 
            {
                if (error.response) 
                {
                    return Promise.reject(
                    {
                        success: false,
                        message: error.response.data?.message || 'Unknown server error.'
                    })
                } 
                else if (error.request) 
                {
                    try 
                    {
                        const responseData = JSON.parse(error.request.response || '{}')

                        return Promise.reject(
                        {
                            success: false,
                            message: responseData?.message || error.message
                        })
                    } 
                    catch 
                    {
                        return Promise.reject(
                        {
                            success: false,
                            message: error.message
                        })
                    }
                }
            }

            return Promise.reject(
            {
                success: false,
                message: error?.message || 'An unknown error occurred.'
            })
        }
    },

    async get(endpoint, query = {}, headers = {}) 
    {
        return this.send('get', endpoint, query, {}, headers)
    },

    async post(endpoint, data = {}, query = {}, headers = {}) 
    {
        return this.send('post', endpoint, query, data, headers)
    },

    async put(endpoint, data = {}, query = {}, headers = {}) 
    {
        return this.send('put', endpoint, query, data, headers)
    },

    async delete(endpoint, query = {}, headers = {}) 
    {
        return this.send('delete', endpoint, query, {}, headers)
    },

    async download(endpoint, query = {}, filename = 'download.csv') 
    {
        const headers = {
            'authorization': 'Bearer ' + storage.get('token')
        };
        
        try 
        {
            const response = await axios({
                method: 'GET',
                url: '/api/' + endpoint,
                params: query,
                headers: headers,
                responseType: 'blob'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            return { success: true };
        } 
        catch (error) 
        {
            console.error('Download failed:', error);
            return Promise.reject({
                success: false,
                message: 'Download failed'
            });
        }
    }
}