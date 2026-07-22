fetch('https://redbeard-manhwa.vercel.app').then(r=>r.text()).then(t=>{
  const match = t.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
  if (match) {
    match.forEach(m => {
      if (m.includes('adsterra') || m.includes('base64')) {
        console.log(m.substring(0, 500));
      }
    })
  }
}).catch(console.error);
