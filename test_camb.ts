import { CambClient } from '@camb-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const client = new CambClient({ apiKey: process.env.CAMB_API_KEY });
  try {
     const voices = await client.voiceCloning.listVoices();
     console.log(JSON.stringify(voices, null, 2));
  } catch(e: any) {
    console.error(e);
  }
}
test();
