const { StreamChat } = require('stream-chat');
require('dotenv').config({ path: '.env' });

async function check() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
  const apiSecret = process.env.STREAM_SECRET_KEY || process.env.STREAM_SECRET;

  const serverClient = StreamChat.getInstance(apiKey, apiSecret);
  
  // Just fetch some users and see their devices
  const { users } = await serverClient.queryUsers({}, { created_at: -1 }, { limit: 10 });
  const userId = users[0]?.id;
  if (userId) {
    try {
      console.log(`Adding test device for ${userId}`);
      await serverClient.addDevice('fake-token-1234', 'firebase', userId, 'firebase');
      console.log('Successfully added device!');
      const { devices } = await serverClient.getDevices(userId);
      console.log('Devices after addition:', devices);
    } catch (err) {
      console.error('Error adding device:', err.message);
    }
  }
}

check().catch(console.error);
