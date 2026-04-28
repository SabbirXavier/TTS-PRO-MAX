import { CambClient } from '@camb-ai/sdk';

async function listVoices() {
  try {
    const client = new CambClient({ apiKey: 'YOUR_CAMB_API_KEY' }); // Oh wait, I don't have the API key!
    // Without API key, I can't list voices.
  } catch (err) {
    console.error(err);
  }
}
listVoices();
