fetch('https://redbeard-manhwa.vercel.app').then(r=>r.text()).then(t=>{
  const idx = t.indexOf('data-provider');
  if (idx !== -1) {
    console.log(t.substring(Math.max(0, idx - 200), idx + 200));
  } else {
    console.log("No data-provider found");
  }
}).catch(console.error);
