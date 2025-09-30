import axios from 'axios';

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

async function run() {
  const propertyId = process.env.PROPERTY_ID ?? 'prop-1';
  const response = await axios.post(`${baseUrl}/reports/weekly`, null, { params: { propertyId } });
  // eslint-disable-next-line no-console
  console.log('Triggered weekly snapshot', response.data);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Weekly snapshot trigger failed', err.message);
  process.exit(1);
});
