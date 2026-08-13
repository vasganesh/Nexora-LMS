async function main() {
  console.log("Sending login request to http://localhost:3000/api/auth/login...");
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teacher@nexoralearning.com',
        password: 'password123'
      })
    });
    console.log("Status code:", res.status);
    const body = await res.json();
    console.log("Response body:", JSON.stringify(body, null, 2));
  } catch (err: any) {
    console.error("Login request failed:", err.message || err);
  }
}

main();
