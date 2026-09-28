async function run() {
  try {
    const searchRes = await fetch('https://redbeard.store/api/search?q=Mom');
    const searchData = await searchRes.json();
    if (!searchData.data || searchData.data.length === 0) {
      console.log("Series not found");
      return;
    }
    console.log("Search Result:", JSON.stringify(searchData.data[0], null, 2));
    const seriesRes = await fetch(`https://redbeard.store/api/series/${searchData.data[0].slug}`);
    const seriesData = await seriesRes.json();
    const chapterId = seriesData.data.chapters[0].id;
    console.log("Chapter ID:", chapterId);


    const resolveUrl = `https://redbeard.store/api/chapter/${chapterId}/download?resolve=true`;
    console.log("Resolving:", resolveUrl);
    
    const resolveRes = await fetch(resolveUrl);
    const resolveData = await resolveRes.json();
    console.log("Resolve response:", JSON.stringify(resolveData, null, 2));

    if (resolveData.url) {
      const downloadUrl = resolveData.url.startsWith('/') ? `https://redbeard.store${resolveData.url}` : resolveData.url;
      console.log("Testing download URL:", downloadUrl);
      
      const dlRes = await fetch(downloadUrl, { method: 'HEAD', headers: resolveData.downloadHeaders || {} });
      console.log("Download HEAD status:", dlRes.status, dlRes.statusText);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
