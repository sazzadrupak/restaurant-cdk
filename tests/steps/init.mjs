import { config } from 'dotenv';

// The setup function will be called by Vitest when we configure this init module as a globalSetup module (see the official doc here).
export default function setup() {
  config();
  config({ path: '.env.events' });
  process.env.AWS_REGION = 'us-east-1';
}
