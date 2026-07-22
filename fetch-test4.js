fetch('https://redbeard-manhwa.vercel.app').then(r=>r.text()).then(t=>{
  const flightIndex = t.indexOf('__next_f.push');
  if (flightIndex !== -1) {
    const flightData = t.substring(flightIndex);
    const allLines = flightData.split('__next_f.push');
    allLines.forEach(line => {
      if (line.includes('adsterra') && !line.includes('adsterraPopunder')) {
        console.log(line.substring(0, 500));
      }
    });
  }
}).catch(console.error);
