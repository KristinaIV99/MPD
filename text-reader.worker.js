// text-reader.worker.js
import { marked } from './vendor/marked.esm.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js';

const activeJobs = new Map();

async function processMarkdown(text, sanitize) {
    try {
        const html = await marked.parse(text);
        return sanitize ? DOMPurify.sanitize(html, {
            FORBID_TAGS: ['iframe', 'script'],
            FORBID_ATTR: ['onclick']
        }) : html;
    } catch (error) {
        throw new Error(`Markdown konvertavimo klaida: ${error.message}`);
    }
}

self.addEventListener('message', async (e) => {
    const { type, jobId, text, sanitize } = e.data;

    // Užklausos atšaukimas
    if (type === 'cancel') {
        const job = activeJobs.get(jobId);
        if (job?.abortController) {
            job.abortController.abort();
            activeJobs.delete(jobId);
        }
        return;
    }

    // Naujas darbas
    if (!activeJobs.has(jobId)) {
        const abortController = new AbortController();
        activeJobs.set(jobId, { abortController });

        try {
            // Dydžio validacija
            if (text.length > 10 * 1024 * 1024) {
                throw new Error('Tekstas viršija 10MB limitą');
            }

            const html = await Promise.race([
                processMarkdown(text, sanitize),
                new Promise((_, reject) => {
                    abortController.signal.onabort = () => 
                        reject(new DOMException('Operation aborted', 'AbortError'));
                })
            ]);

            self.postMessage({
                jobId,
                html,
                status: 'complete'
            });
        } catch (error) {
            self.postMessage({
                jobId,
                error: error.message,
                status: 'error'
            });
        } finally {
            activeJobs.delete(jobId);
        }
    }
});
