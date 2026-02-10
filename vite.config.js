import { defineConfig } from 'vite'

export default defineConfig({
    base: '/',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: './index.html',
                about: './about.html',
                work: './work.html',
                project: './project.html',
                services: './services.html',
                service: './service.html',
                contact: './contact.html',
                blog: './blog.html',
                blogPost: './blog-post.html',
                faqs: './faqs.html',
                privacy: './privacy.html',
                terms: './terms.html'
            }
        }
    }
})
