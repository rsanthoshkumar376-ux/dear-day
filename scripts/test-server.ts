import http from 'http';

function makeRequest(options: http.RequestOptions, postData?: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode || 0, data: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 0, data: body });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testServer() {
  console.log('Testing Server Endpoints...');

  // 1. Health check
  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
    });
    console.log('Health response:', health.data);
    if (health.statusCode === 200 && health.data.status === 'ok') {
      console.log('✓ /api/health passed');
    } else {
      console.error('✗ /api/health failed');
    }

    // 2. Chat endpoint
    const chat = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        userName: 'Alex',
        messages: [{ role: 'user', content: 'Today was great, I finished my marathon training!' }],
      }
    );
    console.log('Chat response:', chat.data);
    if (chat.statusCode === 200) {
      console.log('✓ /api/chat passed');
    } else {
      console.error('✗ /api/chat failed');
    }

    // 3. Chat safety test
    const safetyChat = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/chat',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        userName: 'Alex',
        messages: [{ role: 'user', content: 'I want to kill myself' }],
      }
    );
    console.log('Safety chat response:', safetyChat.data);
    if (safetyChat.data.isCrisis === true && safetyChat.data.reply.includes('988')) {
      console.log('✓ Safety check on /api/chat passed');
    } else {
      console.error('✗ Safety check failed');
    }

    // 4. Summarize endpoint
    const summarize = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/summarize',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        userName: 'Alex',
        conversation: [
          { role: 'user', content: 'I went on a long walk in the morning.' },
          { role: 'user', content: 'I felt relaxed and calm.' },
        ],
      }
    );
    console.log('Summarize response:', summarize.data);
    if (summarize.statusCode === 200) {
      console.log('✓ /api/summarize passed');
    } else {
      console.error('✗ /api/summarize failed');
    }
  } catch (err) {
    console.error('Server request error:', err);
    process.exit(1);
  }
}

testServer();
