import { api } from '@utils/api'
import { common } from '@utils/common'
import { popup } from '@utils/popup'
import { dropdown } from '@utils/dropdown'

export const form =
{
    getData (event, callback, accumulator = {})
    {
        event.preventDefault()
        const form = event.target.closest('form')

        form.querySelectorAll('input, select, textarea').forEach((input) =>
        {
            // Skip inputs in nested forms
            if (input.closest('form[name]') && input.closest('form[name]') !== form)
            {
                return
            }

            const key = input.name
            if (!key)
            {
                return
            }

            let value
            if (input.type === 'file' && input.files.length > 0)
            {
                // Store as array of File objects
                value = Array.from(input.files)
            }
            else if (input.type === 'checkbox')
            {
                value = input.checked ? 'true' : 'false'
            }
            else if (input.type === 'number')
            {
                value = !input.value ? '' : (!isNaN(Number(input.value)) ? Number(input.value) : '')
            }
            else if (input.multiple)
            {
                // Multiple selection => array of strings
                value = input.value.split(',').map(item => item.trim()).filter(Boolean)
            }
            else
            {
                value = input.value || ''
            }

            // Merge into accumulator, turning existing entries into arrays if needed
            if (accumulator.hasOwnProperty(key))
            {
                if (!Array.isArray(accumulator[key]))
                {
                    accumulator[key] = [accumulator[key]]
                }
                if (Array.isArray(value))
                {
                    accumulator[key] = accumulator[key].concat(value)
                }
                else
                {
                    accumulator[key].push(value)
                }
            }
            else
            {
                accumulator[key] = value
            }
        })

        // Process nested forms
        form.querySelectorAll('form[name]').forEach((nestedForm) =>
        {
            const formName = nestedForm.getAttribute('name')
            const nestedData = this.extractFields(nestedForm)

            if (accumulator.hasOwnProperty(formName))
            {
                if (!Array.isArray(accumulator[formName]))
                {
                    accumulator[formName] = [accumulator[formName]]
                }
                accumulator[formName].push(nestedData)
            }
            else
            {
                accumulator[formName] = [nestedData]
            }
        })

        // Convert accumulator => FormData
        const formData = new FormData()

        Object.keys(accumulator).forEach((key) =>
        {
            const value = accumulator[key]

            // If it's an array, we store it as JSON in a single key
            if (Array.isArray(value))
            {
                // If you have a special case for files inside arrays, you'll need
                // extra logic here. For purely string arrays, JSON.stringify is enough.
                formData.append(key, JSON.stringify(value))
            }
            else if (value instanceof File)
            {
                formData.append(key, value)
            }
            else if (typeof value === 'object' && value !== null)
            {
                // Nested objects also stored as JSON
                formData.append(key, JSON.stringify(value))
            }
            else
            {
                formData.append(key, value)
            }
        })

        console.log("Form Submited: ", formData.values());

        if (callback)
        {
            callback(event, formData, null, true)
        }
        return formData
    },

    extractFields (formElement)
    {
        let fields = { }

        formElement.querySelectorAll('input, select, textarea').forEach((input) =>
        {
            const key = input.name
            if (!key)
            {
                return
            }

            let value
            if (input.type === 'file' && input.files.length > 0)
            {
                value = Array.from(input.files)
            }
            else if (input.type === 'checkbox')
            {
                value = input.checked
            }
            else if (input.type === 'number')
            {
                value = !input.value ? null : (!isNaN(Number(input.value)) ? Number(input.value) : null)
            }
            else if (input.multiple)
            {
                value = input.value.split(',').map(item => item.trim()).filter(Boolean)
            }
            else
            {
                value = input.value || null
            }

            fields[key] = value
        })

        return fields
    },

    toAPI (event, type, endpoint, callback)
    {
        event.preventDefault()
        if (!this.startLoading(event))
        {
            return
        }

        const data = this.getData(event)

        api.send(type.toLowerCase(), endpoint, {}, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .then((response) =>
        {
            common.notification(response.message)
            if (callback)
            {
                callback(event, data, response, true)
            }
        })
        .catch((response) =>
        {
            common.notification(response.message, false)
            if (callback)
            {
                callback(event, data, response, false)
            }
        })
        .finally(() =>
        {
            this.stopLoading(event)
        })
    },

    startLoading (event)
    {
        const button = event.submitter
        if (!button)
        {
            return false
        }
        if (button.getAttribute('type') !== 'submit')
        {
            return false
        }
        if (button.classList.contains('loading'))
        {
            return false
        }
        button.classList.add('loading')
        return true
    },

    stopLoading (event)
    {
        const button = event.submitter
        if (button)
        {
            button.classList.remove('loading')
        }
    }
}