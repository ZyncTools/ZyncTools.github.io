/**
 * Per-tool page copy: how-to steps and FAQs.
 *
 * Search engines reward pages that answer the question behind the query, and
 * penalise 124 pages of the same boilerplate with the name swapped in. So
 * this builds each page's copy from what the tool actually declares — its
 * input kind, its real option labels, the libraries it needs — and adds
 * hand-written entries for the tools people ask the most about.
 *
 * Everything here must stay true of the tool it describes. A generated FAQ
 * that promises a capability the tool does not have is worse than no FAQ.
 */

/* ============================================================
   HOW-TO STEPS
   ============================================================ */
function buildSteps(tool) {
    const settings = (tool.options || []).filter((o) => o.type !== 'note');
    const named = settings.slice(0, 3).map((o) => o.label.toLowerCase());

    const openStep = {
        none: `Open ${tool.name}. There is nothing to upload — it works from the settings alone.`,
        text: `Paste or type your text into the input box. You can also load a text file from your device.`,
        file: `Drop your file onto the upload area, or click it to browse. The file is read in your browser and never uploaded.`,
        files: `Drop your files onto the upload area, or click to browse. You can add up to ${tool.maxFiles} at once, and they are read in your browser rather than uploaded.`
    }[tool.input];

    const steps = [{ name: tool.input === 'none' ? 'Open the tool' : 'Add your input', text: openStep }];

    if (settings.length) {
        steps.push({
            name: 'Choose your settings',
            text: named.length
                ? `Adjust ${named.join(', ')}${settings.length > 3 ? ` and the other ${settings.length - 3} settings` : ''} to suit what you need.`
                : 'Adjust the settings to suit what you need.'
        });
    }

    steps.push({
        name: tool.input === 'none' ? 'Generate' : 'Run the tool',
        text: tool.input === 'none'
            ? 'Press Generate. The result appears immediately and updates whenever you change a setting.'
            : (tool.live
                ? 'The result updates as you type. Press Run to refresh it at any point.'
                : 'Press Run. Processing happens on your own device, so the time it takes depends on your machine rather than a queue.')
    });

    steps.push({
        name: 'Save the result',
        text: 'Copy the output, or press Download to save it. Nothing is kept once you close the tab.'
    });

    return steps;
}

/* ============================================================
   FAQs
   ============================================================ */

/* Questions people genuinely ask about specific tools, in their words.
   Only add an entry here when the answer is specific enough to be worth
   reading — a generic answer belongs in the shared set below. */
const SPECIFIC_FAQS = {
    'compress-pdf': [
        ['Why did my PDF get bigger instead of smaller?',
         'Compression works by rasterising each page into an image. For a text-heavy PDF that is already efficiently encoded, images are larger than the text they replace. The tool detects this and tells you to keep your original. Compression pays off on scans and image-heavy documents, which is where large files usually come from.'],
        ['Will the text still be selectable afterwards?',
         'No. Because pages are re-rendered as images, the text layer is lost. If you need selectable text, use a lower compression level on a scan, or keep the original.']
    ],
    'merge-pdf': [
        ['Can I control the order of the files?',
         'Yes. Files merge in the order they are listed, and you can also sort by file name ascending or descending. Each source file gets a bookmark in the merged document so you can jump between them.']],
    'split-pdf': [
        ['Can I split into uneven sections?',
         'Yes. Choose "Custom ranges" and enter something like 1-3, 4-10, 11-. Each range becomes its own file, and everything is packaged into a ZIP.']],
    'protect-pdf': [
        ['What happens if I forget the password?',
         'The file cannot be opened by anyone, including us. Encryption happens in your browser with AES-256 and no key is stored anywhere. Keep a copy of the password somewhere safe before you rely on the encrypted file.'],
        ['Is this the same as the password my PDF reader asks for?',
         'Yes. It sets the standard PDF user password, so any reader will prompt for it.']
    ],
    'unlock-pdf': [
        ['Can this open a PDF when I do not know the password?',
         'No. It removes a password you already have, so you do not have to type it every time. It does not crack unknown passwords, and nothing here attempts to.']],
    'pdf-ocr': [
        ['Why is the first run slow?',
         'The first run downloads a language model of roughly 10 to 15 MB. After that it is cached by your browser and later runs start immediately.'],
        ['How do I get better accuracy?',
         'Render at 300 DPI rather than 150, leave the contrast boost on for faint scans, and make sure the language setting matches the document. Straight, high-contrast scans read far better than photographs of paper.']
    ],
    'image-compressor': [
        ['What quality setting should I use?',
         'Around 75 is a good default for photographs — most people cannot see the difference from the original at normal viewing size. Below about 50 you start to see blocky artefacts in smooth areas like skies.'],
        ['My PNG barely shrank. Why?',
         'PNG is lossless, so quality has no effect on it. For photographs, converting to JPEG or WebP will save far more. PNG is the right choice for screenshots, logos and anything needing transparency.'],
        ['Can I hit an exact file size?',
         'Yes. Choose "Target file size" and enter a number in KB. The tool searches quality settings automatically to land just under it.']
    ],
    'image-converter': [
        ['Which format should I choose?',
         'WebP is the best default: noticeably smaller than JPEG at the same quality and supported everywhere current. Use JPEG for maximum compatibility, PNG when you need transparency or perfectly sharp edges, and AVIF for the smallest files if your audience is on recent browsers.'],
        ['Why does AVIF sometimes fail?',
         'Not every browser can encode AVIF. Rather than silently saving a PNG and misleading you, the tool checks first and tells you to pick another format.']
    ],
    'image-metadata-remover': [
        ['Does this really remove GPS location?',
         'Yes. The image is decoded to raw pixels and re-encoded, so every metadata block — EXIF, GPS, camera details, editing history — is discarded. Only the pixels survive. Use the metadata viewer afterwards to confirm.']],
    'image-metadata-viewer': [
        ['My photo shows no EXIF. Is something wrong?',
         'Probably not. Screenshots and images exported by many apps carry none, and most social platforms strip it on upload. PNG and WebP also frequently have none.']],
    'qr-code-generator': [
        ['What error correction level should I pick?',
         'Medium is right for most uses. Choose High if the code will be printed small, placed on a curved surface, or has a logo over the middle — it can still be read with up to 30% of the code damaged or covered.'],
        ['Does the Wi-Fi QR code work on both iPhone and Android?',
         'Yes. It uses the standard WIFI: format that both camera apps recognise natively.']
    ],
    'password-generator': [
        ['Are these passwords actually random?',
         'Yes. They come from crypto.getRandomValues, the browser\'s cryptographic random source, not Math.random. Generation happens locally and no password is ever transmitted or logged.'],
        ['Should I use a random password or a passphrase?',
         'A passphrase of four or more words is easier to type and remember while being just as hard to guess. Use random characters where a site imposes a length limit, since entropy per character is higher.']
    ],
    'text-encryptor': [
        ['How strong is the encryption?',
         'AES-256-GCM with a key derived from your passphrase using PBKDF2 at up to 600,000 rounds. That is the same primitive used by password managers. Its strength depends almost entirely on your passphrase being long and unguessable.']],
    'hash-generator': [
        ['Which algorithm should I use?',
         'SHA-256 for anything security-related. MD5 and SHA-1 are included because you still need them to verify older published checksums, but both are broken for security purposes and should not be used to protect anything.']],
    'word-counter': [
        ['Does it count the way word processors do?',
         'Yes — words are runs of non-whitespace characters, which is what Word and Google Docs count. Reading time assumes 220 words per minute by default, and you can change that.']],
    'json-formatter': [
        ['Where exactly is my JSON invalid?',
         'The error message gives the line and column of the first problem, rather than just saying the document is invalid. Trailing commas and single quotes are the two most common causes.']],
    'video-to-gif': [
        ['Why is my GIF so large?',
         'GIF is an old format with no modern compression. Width matters most: halving it roughly quarters the file. Lowering the frame rate and shortening the clip help too. A 3-second clip at 480px and 12fps typically lands between 1 and 4 MB.']],
    'extract-audio-from-video': [
        ['My video will not load. Why?',
         'Your browser has to be able to decode the container. MP4 and WebM work everywhere; MKV and AVI often use codecs browsers cannot open. Converting to MP4 first will fix it.']]
};

/* Asked of nearly every tool. Phrased per tool so the answer is specific. */
function sharedFaqs(tool) {
    const faqs = [];

    faqs.push([
        `Are my files uploaded when I use ${tool.name}?`,
        `No. ${tool.name} runs entirely inside your browser. Your ${tool.input === 'text' ? 'text' : 'file'} is read locally, processed on your own device, and handed straight back to you. You can confirm this yourself: open your browser's developer tools, watch the Network tab, and run the tool — no request carries your data anywhere.`
    ]);

    faqs.push([
        `Is ${tool.name} free?`,
        'Yes, completely. No account, no sign-up, no watermark on your output, and no cap on how many times you can use it. The project is open source under the AGPL licence.'
    ]);

    if (tool.input === 'file' || tool.input === 'files') {
        faqs.push([
            'Is there a file size limit?',
            'There is no server limit, because nothing is uploaded. The practical ceiling is your device\'s memory — on a modern laptop, files up to a few hundred megabytes are comfortable, while phones handle less. If a tab becomes unresponsive, the file was too large for the memory available.'
        ]);
    }

    if (tool.input === 'files' && tool.maxFiles > 1) {
        faqs.push([
            `Can I process several files at once with ${tool.name}?`,
            `Yes — up to ${tool.maxFiles} at a time. When there are more than a few results they are packaged into a ZIP so you get everything in one download.`
        ]);
    }

    if (tool.heavy) {
        faqs.push([
            'Why does this take a while?',
            'The work happens on your device rather than a server, so speed depends on your own processor. That is the trade for never uploading anything. Larger files and higher quality settings take proportionally longer.'
        ]);
    }

    faqs.push([
        `Does ${tool.name} work offline?`,
        'Mostly. The site caches itself after your first visit, so it keeps working without a connection. Tools that need a specialised library — PDF editing, OCR, QR codes, MP3 encoding — need a connection the first time you run them, then that library is cached too.'
    ]);

    return faqs;
}

function buildFaqs(tool) {
    const specific = (SPECIFIC_FAQS[tool.id] || []).map(([q, a]) => ({ question: q, answer: a }));
    const shared = sharedFaqs(tool).map(([q, a]) => ({ question: q, answer: a }));
    // Tool-specific questions first: they are what the visitor came to ask.
    return specific.concat(shared);
}

module.exports = { buildSteps, buildFaqs };
