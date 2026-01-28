import 'dotenv/config';
import { createApp } from './app';
import { seedBaseTranslations } from './services/translation.service';

const PORT = process.env.PORT || 4500;

const app = createApp();

app.listen(PORT, async () => {
  console.log(`Sporttia ZERO API server running on port ${PORT}`);

  // Seed base translations to database (runs in background)
  seedBaseTranslations().catch((err) => {
    console.error('Failed to seed base translations:', err);
  });
});
