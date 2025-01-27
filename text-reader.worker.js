import Logger from './logger.js';
import { LOG_LEVELS } from './logger.js';

const logger = new Logger('Worker');
const activeJobs = new Map();

async function processText(text) {
   try {
       logger.debug('Pradedamas teksto apdorojimas');
       return text;
   } catch (error) {
       logger.error('Apdorojimo klaida:', error);
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
