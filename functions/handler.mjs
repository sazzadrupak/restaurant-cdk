export const hello = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World!',
      input: event,
    }),
  };

  return response;
};
