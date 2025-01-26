// text-reader.worker.js
import { marked } from 'marked';

const activeJobs = new Map();

function processJob(jobId, text) {
    return new Promise((resolve, reject) => {
        const abortHandler = () => {
            reject(new Error('Užklausa atšaukta'));
        };

        const controller = new AbortController();
        activeJobs.set(jobId, {
            abort: () => controller.abort(),
            controller
        });

        controller.signal.addEventListener('abort', abortHandler);

        marked.parseAsync(text)
            .then(html => {
                controller.signal.removeEventListener('abort', abortHandler);
                resolve(html);
            })
            .catch(reject);
    });
}

self.onmessage = async (e) => {
    const { type, jobId, text } = e.data;

    // Užklausos atšaukimas
    if (type === 'cancel') {
        const job = activeJobs.get(jobId);
        if (job) {
            job.abort();
            activeJobs.delete(jobId);
        }
        return;
    }

    // Teksto apdorojimas
    if (!activeJobs.has(jobId)) {
        activeJobs.set(jobId, { status: 'processing' });

        try {
            // Dydžio validacija
            if (text.length > 10 * 1024 * 1024) {
                throw new Error('Tekstas viršija 10MB limitą');
            }

            const html = await processJob(jobId, text);
            
            if (activeJobs.has(jobId)) {
                self.postMessage({
                    jobId,
                    html,
                    status: 'complete'
                });
            }
        } catch (error) {
            if (activeJobs.has(jobId)) {
                self.postMessage({
                    jobId,
                    error: error.message,
                    status: 'error'
                });
            }
        } finally {
            activeJobs.delete(jobId);
        }
    }
};
