import { TextNormalizer } from './text-normalizer.js';

const WORKER_NAME = '[Worker]';
const normalizer = new TextNormalizer();
const activeJobs = new Map();

async function processText(text) {
  try {
    console.debug(`${WORKER_NAME} Pradedamas teksto apdorojimas`);
    return normalizer.normalizeMarkdown(text);
  } catch (error) {
    console.error(`${WORKER_NAME} Apdorojimo klaida:`, error);
    throw new Error(`Teksto apdorojimo klaida: ${error.message}`);
  }
}

self.addEventListener('message', async (e) => {
  const { type, jobId, text } = e.data;
  
  if (type === 'cancel') {
    const job = activeJobs.get(jobId);
    if (job?.abortController) {
      job.abortController.abort();
      activeJobs.delete(jobId);
    }
    return;
  }

  if (!activeJobs.has(jobId)) {
    const abortController = new AbortController();
    activeJobs.set(jobId, { abortController });
    
    try {
      if (text.length > 10 * 1024 * 1024) {
        throw new Error('Tekstas viršija 10MB limitą');
      }

      const processedText = await Promise.race([
        processText(text),
        new Promise((_, reject) => {
          abortController.signal.onabort = () =>
            reject(new DOMException('Operation aborted', 'AbortError'));
        })
      ]);

      self.postMessage({
        jobId,
        text: processedText,
        status: 'complete'
      });
    } catch (error) {
      console.error(`${WORKER_NAME} Klaida apdorojant darbą ${jobId}:`, error);
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
