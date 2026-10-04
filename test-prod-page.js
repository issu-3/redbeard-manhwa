async function main() {
  const url = 'https://redbeard.store/api/chapter/cmutjrr3c000004lbib5h9mo3/page/0';
  console.log('Fetching API directly:', url);
  
  // Use manual redirect handling to see the redirect
  const res = await fetch(url, { redirect: 'manual' });
  console.log(`Response: ${res.status} ${res.statusText}`);
  console.log('Location header:', res.headers.get('location'));
  
  if (res.status === 302 || res.status === 307 || res.status === 308) {
    const redirectUrl = res.headers.get('location');
    console.log('\nFollowing redirect to:', redirectUrl);
    const redirRes = await fetch(redirectUrl);
    console.log(`Redirect Response: ${redirRes.status} ${redirRes.statusText}`);
    console.log(`Redirect Content-Type: ${redirRes.headers.get('content-type')}`);
    
    // Check if it's a valid image
    const buffer = await redirRes.arrayBuffer();
    console.log(`Image size: ${buffer.byteLength} bytes`);
  } else {
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    const buffer = await res.arrayBuffer();
    console.log(`Image size: ${buffer.byteLength} bytes`);
  }
}
main();
