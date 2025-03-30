async function getHindiTextAsync(msg) {
    if (!msg || msg.trim() === "") {
        return "";
    }

    try {
        msg = msg.replace(/,/g, "");
        const url = `https://www.google.com/transliterate/indic?tlqt=1&langpair=en|hi&text=${encodeURIComponent(msg)}&tl_app=3`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const hindiText = data?.[0]?.hws?.[0] || "";
        return hindiText;
    } catch (error) {
        console.error(`Error fetching Hindi text: ${error.message}`);
        return "";
    }
}