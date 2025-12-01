import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@form': path.resolve(__dirname, './src/components/form'),
            '@global': path.resolve(__dirname, './src/components/global'),
            '@floated': path.resolve(__dirname, './src/components/floated'),
            
            '@panels': path.resolve(__dirname, './src/panels'),
            '@plugins': path.resolve(__dirname, './src/applications'),

            '@utils': path.resolve(__dirname, './src/other/utils'),
            '@pages': path.resolve(__dirname, './src/other/pages'),
            '@layouts': path.resolve(__dirname, './src/other/layouts'),
            '@directives': path.resolve(__dirname, './src/other/directives'),
            '@logic': path.resolve(__dirname, './src/other/logic'),
            '@stores': path.resolve(__dirname, './src/other/stores'),

            '@user_shared': path.resolve(__dirname, './src/panels/user/plugins/_shared'),
            '@user_events': path.resolve(__dirname, './src/panels/user/plugins/events'),
            '@user_account': path.resolve(__dirname, './src/panels/user/plugins/account'),
            '@user_dashboard': path.resolve(__dirname, './src/panels/user/plugins/dashboard'),
            '@user_teams': path.resolve(__dirname, './src/panels/user/plugins/teams'),
            '@user_bookings': path.resolve(__dirname, './src/panels/user/plugins/bookings'),
            '@user_billing': path.resolve(__dirname, './src/panels/user/plugins/billing'),
            '@user_contacts': path.resolve(__dirname, './src/panels/user/plugins/contacts'),
            '@user_survey': path.resolve(__dirname, './src/panels/user/plugins/survey'),
            '@user_availability': path.resolve(__dirname, './src/panels/user/plugins/availability'),
            '@user_potential_leads': path.resolve(__dirname, './src/panels/user/plugins/potential-leads'),
            '@user_organizations': path.resolve(__dirname, './src/panels/user/plugins/organizations'),
            '@user_integrations': path.resolve(__dirname, './src/panels/user/plugins/integrations'),
            '@user_workflows': path.resolve(__dirname, './src/panels/user/plugins/workflows'),
            '@user_forms': path.resolve(__dirname, './src/panels/user/plugins/forms'),
            '@user_instant-meeting': path.resolve(__dirname, 'src/panels/user/plugins/instant-meeting'),



            '@user_builder': path.resolve(__dirname, './src/panels/user/extensions/builder'),

            '@account': path.resolve(__dirname, './src/plugins/account'),
            '@settings': path.resolve(__dirname, './src/plugins/settings'),
            '@billing': path.resolve(__dirname, './src/plugins/billing'),

            '@users': path.resolve(__dirname, './src/plugins/users'),
            '@dashboard': path.resolve(__dirname, './src/plugins/dashboard'),
            '@extensions': path.resolve(__dirname, './src/plugins/extensions'),
            '@notifications': path.resolve(__dirname, './src/plugins/notifications'),
            '@search': path.resolve(__dirname, './src/plugins/search')
        }
    },
    plugins: [vue()],
    build: {
        outDir: path.resolve(__dirname, './dist'),
        rollupOptions: {
            output: {
                manualChunks: () => 'main.js'
            }
        }
    },
    server: {
        hmr: true,
        host: '0.0.0.0',
        port: 5174,
        allowedHosts: ['app.skedi.com', 'front.skedi.com', 'app.skedi.com', 'skedi.com']
    },
    preview: {
        port: 5174,
    }
})
