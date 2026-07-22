fetch('https://redbeard-manhwa.vercel.app').then(r=>r.text()).then(t=>{
  const flightIndex = t.indexOf('__next_f.push');
  if (flightIndex !== -1) {
    const flightData = t.substring(flightIndex);
    const matches = flightData.match(/"html":"([^"]+)"/g);
    if (matches) {
      console.log(matches);
    } else {
      console.log("No html prop found in flight data for AdsterraRenderer");
      // Let's print the entire flight string containing 'adsterra'
      const allLines = flightData.split('<script>');
      allLines.forEach(line => {
        if (line.includes('adsterra') && !line.includes('adsterraPopunder')) {
          console.log(line.substring(0, 1000));
        }
      });
    }
  }
}).catch(console.error);
