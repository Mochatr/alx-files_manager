import express from 'express';
import routes from './routes/index.js';

const app = express();

// Load routes
app.use('/', routes);

// Set the port
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
