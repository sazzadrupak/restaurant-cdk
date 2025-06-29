import fs from 'fs';

const html = fs.readFileSync('static/index.html', 'utf8');

export const handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const response = {
    statusCode: 200,
    body: html,
    headers: {
      'Content-Type': 'text/html charset=UTF-8',
    },
  };

  return response;
};
