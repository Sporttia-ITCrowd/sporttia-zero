import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT || 4500;

const app = createApp();

app.listen(PORT, () => {
  console.log(`Sporttia ZERO API server running on port ${PORT}`);
});
