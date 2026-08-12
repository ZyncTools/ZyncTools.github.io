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
   HAND-WRITTEN PAGE COPY
   ============================================================ */

/*
 * The generated intro and steps below are fine for a long tail of tools
 * nobody searches for by name. They are not good enough for the handful we
 * intend to rank for: 180 pages sharing four step headings and eleven
 * identical sentences is the exact shape of a templated site, and it reads
 * that way to a person too.
 *
 * These entries replace the generated copy for the tools on the front page.
 * Everything here has to stay true of the tool it describes — check the
 * option list in the registry before changing a claim, and prefer naming a
 * real limitation over writing around it.
 */
const SPECIFIC_INTRO = {
    'merge-pdf': [
        '<p>Merge PDF joins several PDFs into one file, keeping every page at its original size and quality. Nothing is re-encoded, so a merged document is exactly as sharp as the files that went into it, and the combined size is roughly the sum of the parts.</p>',
        '<p><strong>You control the order.</strong> Files combine in the order you listed them by default, or you can sort by file name ascending, descending, or reverse the whole list. If you only want part of a document, the page field takes ranges like <code>1-3, 7, 12-</code> and applies them to each file as it is added.</p>',
        '<p><strong>Each source file becomes a bookmark.</strong> The merged PDF gets an outline entry per original document, so a fifty-page combined report still opens at the section you want in any reader. Turn it off if you would rather the seams did not show.</p>',
        '<p><strong>Nothing is uploaded.</strong> Most merge tools take your documents to a server, which is why they cap file sizes and ask you to sign in. This one reads the PDFs in the browser, so contracts, medical letters and anything else covered by a confidentiality obligation never leave your machine. There is no size cap beyond your own memory, and no queue.</p>'
    ],

    'split-pdf': [
        '<p>Split PDF takes one document apart four different ways: a separate file for every page, fixed-size chunks of however many pages you choose, named ranges like <code>1-5, 9-12</code>, or a clean break at specific page numbers. The pages themselves are copied untouched, so nothing is re-compressed on the way out.</p>',
        '<p><strong>Which mode you want depends on the job.</strong> Every page is right for pulling apart a batch of scanned forms. Chunks suit splitting a long report into equal pieces for emailing. Ranges are for when you know exactly which sections you want. And "start a new file at" is the one for a stack of documents that were scanned into a single PDF, where you know each new document begins at page 5, 10, and so on.</p>',
        '<p><strong>Everything comes back as a ZIP</strong> when there is more than one file, built in the browser. Add a file name prefix and the parts come out named predictably rather than as a pile of numbers.</p>',
        '<p><strong>Your document is never uploaded.</strong> That matters more for splitting than for most operations, because the reason people split a PDF is usually to send one part to someone and not the rest. The whole document staying on your device is the point.</p>'
    ],

    'compress-pdf': [
        '<p>Compress PDF reduces file size by rendering each page and re-encoding it as an image at a lower resolution and quality. Five levels run from light to extreme, or you can set resolution and quality by hand and watch what each change costs you.</p>',
        '<p><strong>This works well on scans and badly on text.</strong> A scanned document is already a series of images, so re-encoding them smaller is a straight win — often 80% or more. A born-digital PDF full of selectable text is a different story: text is stored as instructions to draw glyphs, which is far more compact than a picture of those glyphs. Compressing it can make the file <em>larger</em>.</p>',
        '<p><strong>The tool checks, and tells you.</strong> If the compressed result comes out bigger than the original, you are told to keep the original rather than being handed a worse file with a success message. Greyscale conversion is there for scans of black-and-white paper, where the colour channels are recording nothing but the scanner noise.</p>',
        '<p><strong>The trade-off you are making:</strong> because pages become images, selectable text and any text layer are lost. Search, copy-paste and screen readers stop working on the result. If you need the text preserved, compress lightly or not at all.</p>',
        '<p><strong>It runs on your machine.</strong> Rendering every page of a long PDF takes real processor time — a hundred-page document is not instant. In exchange, a confidential file never gets uploaded to anyone, and there is no size limit or daily quota.</p>'
    ],

    'pdf-to-word': [
        '<p>PDF to Word extracts the text from a PDF and builds a real <code>.docx</code> you can edit in Word, Google Docs, LibreOffice or Pages. Headings are detected from font size, so the document you get has an actual structure rather than one long run of paragraphs.</p>',
        '<p><strong>Be clear about what converts and what does not.</strong> This is a text conversion. Paragraphs, headings and reading order come across. Complex multi-column layouts, tables, floating images and precise positioning do not — no PDF-to-Word converter reproduces those faithfully, and the ones that claim to are usually rebuilding the page as a grid of text boxes you cannot edit comfortably.</p>',
        '<p><strong>It needs a text layer.</strong> If your PDF is a photograph or a scan, there is no text in the file to extract and you will get an empty document. Run it through OCR first to create that text layer, then convert.</p>',
        '<p><strong>Choose paragraphs or lines.</strong> Paragraph mode joins wrapped lines back into flowing paragraphs, which is what you want for prose. Line mode keeps every line break exactly as the PDF had it, which is better for poetry, addresses, code listings or anything where the line breaks carry meaning.</p>',
        '<p><strong>The file is never uploaded.</strong> PDFs people want as Word documents are usually contracts, applications and reports — the exact documents an employer or client would rather you did not hand to a free website. Here the conversion happens in your browser.</p>'
    ],

    'word-to-pdf': [
        '<p>Word to PDF turns a <code>.docx</code> into a PDF that looks the same everywhere and cannot be casually edited. You choose the page size, margin, body font size and line spacing, and can add page numbers.</p>',
        '<p><strong>What comes across:</strong> headings, paragraphs, bold and italic, lists and the reading order. The result is a clean, typeset document rather than a pixel-exact photocopy of what Word showed you.</p>',
        '<p><strong>What does not:</strong> this rebuilds your document rather than replicating Word\'s own layout engine. Embedded fonts, text boxes, columns, headers and footers, tracked changes and complex tables will not survive. For a CV, a letter, an essay or a report it does the job well. For a designed document where the exact layout is the point, print to PDF from Word itself.</p>',
        '<p><strong>Only <code>.docx</code>, not <code>.doc</code>.</strong> The old binary <code>.doc</code> format from Word 2003 and earlier is a different thing entirely and is not supported. Open it in any modern word processor and save as <code>.docx</code> first.</p>',
        '<p><strong>Nothing is uploaded.</strong> Your document is read and converted in the browser, which matters when the file is a job application, a legal letter or anything with your address in it.</p>'
    ],

    'image-to-pdf': [
        '<p>Image to PDF turns photos and scans into a single PDF — the usual reason being that someone has asked for one file rather than fourteen photographs of the same document. It handles JPEG, PNG, WebP and the other formats your browser can read, up to a hundred at a time.</p>',
        '<p><strong>Page size decides everything about how it looks.</strong> "Fit to image" gives each page the exact proportions of its picture, so nothing is cropped or padded — right for photo albums and portfolios. Choosing A4 or Letter puts every image on a standard printable page, which is what you want when the PDF is going to be printed or filed.</p>',
        '<p><strong>Contain, cover or stretch.</strong> Contain fits the whole image on the page and leaves background where the shapes do not match. Cover fills the page completely and crops the overflow. Stretch distorts the image to fit exactly, which is almost never what you want but is there when you need it. Set the page background colour to control what shows in the gaps — white for documents, black for photographs.</p>',
        '<p><strong>Quality is a real trade.</strong> Images are re-encoded as JPEG inside the PDF, so the quality slider controls the file size directly. Around 88 is visually indistinguishable from the original for most photographs; drop it if you need to email the result.</p>',
        '<p><strong>Your photos are never uploaded.</strong> The pictures people turn into PDFs are passports, bank statements, receipts and signed forms. Those stay on your device here.</p>'
    ],

    'sign-pdf': [
        '<p>Sign PDF puts a signature onto a page of a PDF. Draw it with a mouse, trackpad or finger, type your name in one of three handwriting styles, or upload a photograph of a signature you have already made on paper.</p>',
        '<p><strong>Placement is precise.</strong> Six preset positions cover the usual corners, or switch to custom and give exact X and Y coordinates in PDF points measured from the bottom-left. The width slider scales the signature, the margin control keeps it clear of the page edge, and you can add the date underneath automatically.</p>',
        '<p><strong>You can sign any page,</strong> not only the last one. Give a page number, or leave it as "last" for the common case where the signature block is at the end.</p>',
        '<p><strong>What this is and is not.</strong> This applies a visible, drawn signature to the page — the electronic equivalent of signing a printout and scanning it. It is not a cryptographic digital signature: it does not embed a certificate, and it cannot prove who signed or detect later tampering. For ordinary agreements, forms and returned paperwork that visible signature is exactly what is being asked for. If you have been told you need a qualified or certified digital signature, you need a certificate authority, not this.</p>',
        '<p><strong>Nothing is uploaded — and here that is the whole point.</strong> Every other free signing service asks you to send them the contract you are about to sign, and your signature image alongside it. Your signature is a reusable credential; handing it to a website is a genuinely bad idea. Here both stay in your browser.</p>'
    ],

    'image-compressor': [
        '<p>Image Compressor shrinks pictures two ways: pull a quality slider and watch the size fall, or name a target size in kilobytes and let the tool search for the quality setting that lands under it. The second is the one you want when an upload form has told you the limit is 200KB.</p>',
        '<p><strong>Format matters more than the slider.</strong> Converting a photograph from PNG to JPEG usually saves more than any amount of quality reduction, because PNG is lossless and stores photographic noise faithfully. WebP typically beats JPEG by 25-30% at the same visual quality, and AVIF beats WebP again — both are supported by every current browser. Keep PNG only for screenshots, logos and anything with sharp edges or transparency.</p>',
        '<p><strong>Resizing is the bigger lever.</strong> A 4000-pixel-wide photo displayed in a 800-pixel column is carrying twenty-five times more data than it can show. The width limit here caps the dimensions before compressing, which usually does more for file size than the quality slider ever will.</p>',
        '<p><strong>Transparency needs a decision.</strong> JPEG has no alpha channel, so converting a transparent PNG to JPEG has to fill the transparent areas with something — set that colour rather than being surprised by black.</p>',
        '<p><strong>Batch up to a hundred at once,</strong> all processed on your own device. No upload means no waiting on a queue and no file size ceiling, and the holiday photos or ID scans you are compressing are not copied to anyone\'s server.</p>'
    ],

    'image-resizer': [
        '<p>Image Resizer changes the pixel dimensions of a picture six different ways, because "resize" means different things depending on why you are doing it.</p>',
        '<p><strong>Fit</strong> scales the image to sit inside a box you specify while keeping its proportions — the safe default, and the one you want for "make this no bigger than 1280 by 720". <strong>Exact</strong> forces both dimensions and will distort the picture if the aspect ratio does not match. <strong>Cover</strong> fills the box completely and crops whatever overflows, which is how you make square thumbnails from mixed-shape photos. <strong>Percent</strong> scales by a proportion, and <strong>width</strong> or <strong>height</strong> set one dimension and let the other follow.</p>',
        '<p><strong>Enlarging does not add detail.</strong> Scaling a small image up produces a bigger, blurrier version of the same picture — the information was never captured. The "never enlarge" option is on by default so a batch of mixed sizes does not quietly upscale the small ones into mush.</p>',
        '<p><strong>Pick the output format deliberately.</strong> PNG stays lossless and keeps transparency, so repeated edits never degrade. JPEG and WebP are far smaller for photographs. If you are resizing to put images on a website, WebP at quality 85 is usually the right answer.</p>',
        '<p><strong>Up to a hundred images at once,</strong> resized in your browser. Nothing is uploaded, so there is no size limit and no server that keeps a copy.</p>'
    ],

    'image-converter': [
        '<p>Image Converter moves pictures between PNG, JPEG, WebP, AVIF and BMP, and reads HEIC and SVG as inputs. The two conversions people arrive here for are HEIC to JPEG and anything to WebP.</p>',
        '<p><strong>HEIC is why most people come.</strong> iPhones save photos as HEIC by default, and a great deal of software still cannot open them — Windows without a paid codec, older Office, plenty of upload forms. Converting to JPEG or PNG makes the photo work everywhere.</p>',
        '<p><strong>Choosing a target format.</strong> WebP and AVIF are dramatically smaller than JPEG at matching quality and are supported everywhere current; use them for the web. JPEG is the safe choice for anything being sent to someone else or into old software. PNG is for screenshots, diagrams, logos and anything needing transparency. BMP is uncompressed and enormous, and exists here for the rare bit of software that insists on it.</p>',
        '<p><strong>Some conversions lose things, permanently.</strong> Moving to JPEG discards transparency, so set the fill colour first. Converting a lossy image to PNG does not restore quality that was already thrown away — it just stores the existing pixels losslessly in a bigger file. And every lossy re-encode degrades the picture a little further, so convert from your original rather than from a converted copy.</p>',
        '<p><strong>SVG rasterises</strong> at whatever width you set. That is a one-way trip: the result is pixels, and scaling it back up will not be sharp. Keep the SVG.</p>'
    ],

    'qr-code-generator': [
        '<p>QR Code Generator builds codes for eight kinds of content: a link, plain text, Wi-Fi credentials, an email, an SMS, a phone number, a contact card or map coordinates. Each one writes the specific format phone cameras recognise, so scanning a Wi-Fi code offers to join the network rather than showing a line of gibberish.</p>',
        '<p><strong>The Wi-Fi one is the most useful and the least known.</strong> Fill in the network name, password and security type and print the result for guests, a holiday let or an office wall. Scanning it joins the network without anyone reading a long password aloud.</p>',
        '<p><strong>Error correction is a real setting, not decoration.</strong> Level L stores the least redundancy and produces the simplest code; level H can still be read with roughly 30% of the code obscured or damaged. Use H when the code will be printed on something that gets handled, curved, or has a logo placed over the middle. Use L when the content is long and you want the pattern to stay coarse enough to scan from a distance.</p>',
        '<p><strong>Download as SVG if it is going to print.</strong> SVG is vector, so it stays perfectly sharp at any size, from a business card to a shop window. PNG is right for screens and for pasting into a document.</p>',
        '<p><strong>Keep the contrast dark-on-light and keep the quiet zone.</strong> Inverted codes and codes with no margin frequently fail to scan. If you change the colours, test the result with an actual phone before printing a thousand of them.</p>',
        '<p><strong>Generated entirely in your browser,</strong> which matters here: a QR code often contains a Wi-Fi password or personal contact details, and most generators send that to a server. Some free generators also produce codes that redirect through their own domain so they can track scans and, on occasion, expire the code when a trial ends. These are plain, permanent codes that point where you told them to.</p>'
    ],

    'json-formatter': [
        '<p>JSON Formatter pretty-prints, validates and minifies JSON, and when the JSON is broken it tells you the line and column where parsing failed rather than just refusing.</p>',
        '<p><strong>The error position is the point.</strong> Most invalid JSON comes from four things: a trailing comma after the last item, single quotes instead of double, an unquoted key, or a stray control character pasted in from somewhere else. Being told "unexpected token at line 42, column 8" turns a hunt through a thousand lines into a two-second fix.</p>',
        '<p><strong>Sorting keys makes diffs readable.</strong> Two JSON files with the same content in a different key order look completely different to a diff tool. Sort both alphabetically and the real changes stand out. It is also the quickest way to compare two API responses that should match.</p>',
        '<p><strong>Escaping non-ASCII</strong> rewrites accented characters and emoji as <code>\\u</code> sequences. Modern systems handle UTF-8 fine and you rarely need this, but it will save you when a config file is being read by something older that mangles anything outside ASCII.</p>',
        '<p><strong>It formats as you type,</strong> with no run button and no round trip to a server. That is worth more than convenience here: JSON pasted into a formatter is very often an API response containing tokens, customer records or internal identifiers. Pasting that into a website hands it over. Nothing typed here leaves the tab.</p>'
    ]
};

/* Steps for the same tools, written against what the page actually shows. */
const SPECIFIC_STEPS = {
    'merge-pdf': [
        { name: 'Add your PDFs', text: 'Drop the files onto the upload area or click to browse. Add up to 100. They are read in your browser, not uploaded.' },
        { name: 'Put them in order', text: 'Files merge in the order listed. Switch page order to sort by file name ascending or descending, or reverse the whole list.' },
        { name: 'Take only the pages you want', text: 'Leave the page field as "all", or give ranges like 1-3, 7, 12- to take a slice from each file as it goes in.' },
        { name: 'Merge and save', text: 'Press Run, then Download. Each source file becomes a bookmark in the merged PDF so you can still navigate it.' }
    ],
    'split-pdf': [
        { name: 'Add your PDF', text: 'Drop in the document you want to break up. It is read in your browser and never uploaded.' },
        { name: 'Choose how to split it', text: 'Every page for a file per page, chunks for fixed-size groups, ranges for specific sections like 1-5, 9-12, or "start a new file at" when several documents were scanned into one PDF.' },
        { name: 'Name the output', text: 'Add a file name prefix so the parts come out named predictably rather than numbered.' },
        { name: 'Split and download', text: 'Press Run. More than one file comes back as a ZIP, built in the browser.' }
    ],
    'compress-pdf': [
        { name: 'Add your PDF', text: 'Drop in one or more documents — up to 100. Compression works best on scans and image-heavy files.' },
        { name: 'Pick a compression level', text: 'Start with balanced. Move to strong or extreme if the file is still too big, or switch to custom to set resolution and image quality yourself.' },
        { name: 'Consider greyscale', text: 'If the document is a scan of black-and-white paper, converting to greyscale removes colour channels that are only recording scanner noise.' },
        { name: 'Run it and check the result', text: 'Press Run. You are shown the before and after size. If the result came out larger — which happens with text-heavy PDFs — you are told to keep your original.' }
    ],
    'pdf-to-word': [
        { name: 'Add your PDF', text: 'Drop in the document. It needs a text layer: a scan or photo has no text to extract, so run OCR on it first.' },
        { name: 'Choose which pages', text: 'Leave as "all" or give specific pages and ranges to convert only part of the document.' },
        { name: 'Set the structure', text: 'Paragraph mode joins wrapped lines back into flowing paragraphs. Line mode preserves every line break exactly, which suits addresses, poetry and code.' },
        { name: 'Convert and open', text: 'Press Run and download the .docx. It opens in Word, Google Docs, LibreOffice or Pages.' }
    ],
    'word-to-pdf': [
        { name: 'Add your .docx', text: 'Drop in the Word document. Only .docx works — the old binary .doc format is not supported, so re-save it first if needed.' },
        { name: 'Choose page size and margin', text: 'A4, Letter, A5 or Legal, with the margin set in points. A4 for most of the world, Letter for the US.' },
        { name: 'Adjust the typesetting', text: 'Set body font size and line spacing. The default of 11pt at 1.45 spacing reads comfortably for letters and reports.' },
        { name: 'Convert and download', text: 'Press Run. Turn on page numbers first if the document is more than a couple of pages.' }
    ],
    'image-to-pdf': [
        { name: 'Add your images', text: 'Drop in photos or scans — up to 100 at once, in any format your browser reads.' },
        { name: 'Set the page size', text: 'Fit to image gives every page the shape of its picture. A4 or Letter puts each image on a standard printable page.' },
        { name: 'Choose how images sit on the page', text: 'Contain fits the whole image and leaves background in the gaps. Cover fills the page and crops the overflow. Set the background colour to match — white for documents, black for photos.' },
        { name: 'Order, then build', text: 'Sort by file name if the order matters, set the output name, and press Run.' }
    ],
    'sign-pdf': [
        { name: 'Add the PDF', text: 'Drop in the document you need to sign. It stays in your browser — it is never sent anywhere.' },
        { name: 'Make your signature', text: 'Draw it with a mouse, trackpad or finger, type your name in one of three handwriting styles, or upload a photo of a signature made on paper.' },
        { name: 'Place it on the page', text: 'Give a page number or leave it as "last". Pick one of the six preset positions, or choose custom and set exact X and Y coordinates from the bottom-left.' },
        { name: 'Size it and sign', text: 'Adjust the width slider so it looks right against the page, add the date underneath if the form asks for one, then press Run and download.' }
    ],
    'image-compressor': [
        { name: 'Add your images', text: 'Drop in up to 100 pictures. They are read and compressed in your browser.' },
        { name: 'Compress by quality or by target size', text: 'Use the quality slider to trade sharpness for size, or switch to target size and name a limit in KB — useful when a form has told you the maximum.' },
        { name: 'Pick the output format', text: 'JPEG for photos going to other people, WebP or AVIF for the web and much smaller files, PNG only for screenshots, logos and transparency.' },
        { name: 'Cap the width too', text: 'Setting a maximum width usually saves more than the quality slider, because most images are far larger than the space they are displayed in.' }
    ],
    'image-resizer': [
        { name: 'Add your images', text: 'Drop in up to 100 pictures at once.' },
        { name: 'Choose a resize mode', text: 'Fit keeps proportions inside a box. Cover fills and crops, for square thumbnails. Exact forces both dimensions and may distort. Percent, width and height do what they say.' },
        { name: 'Set the dimensions', text: 'Enter your target size. Leave "never enlarge" on so smaller images in a mixed batch are not upscaled into blur.' },
        { name: 'Pick a format and run', text: 'PNG to stay lossless, JPEG or WebP for much smaller photos. Press Run and download.' }
    ],
    'image-converter': [
        { name: 'Add your images', text: 'Drop in up to 100 files. HEIC from an iPhone and SVG both work as inputs.' },
        { name: 'Choose the output format', text: 'JPEG for compatibility, WebP or AVIF for small web files, PNG for transparency and sharp edges, BMP only if some old software demands it.' },
        { name: 'Handle transparency', text: 'If you are converting to JPEG, set the background colour first — JPEG cannot store transparency and will fill it with whatever you choose.' },
        { name: 'Convert and download', text: 'Press Run. Converting several files gives you a ZIP.' }
    ],
    'qr-code-generator': [
        { name: 'Choose what the code contains', text: 'A link, plain text, Wi-Fi credentials, an email, an SMS, a phone number, a contact card or map coordinates. Each writes the format phones actually recognise.' },
        { name: 'Fill in the details', text: 'For Wi-Fi that means the network name, password and security type — usually WPA. For a contact card, whichever name and contact fields you want to share.' },
        { name: 'Set error correction', text: 'Level H survives roughly 30% damage and suits anything printed, handled or covered by a logo. Level L keeps the pattern simplest for long content.' },
        { name: 'Download it', text: 'SVG for printing at any size without blurring, PNG for screens and documents. Scan it with a real phone before you print a batch.' }
    ],
    'json-formatter': [
        { name: 'Paste your JSON', text: 'Type or paste it into the box. It formats as you go — nothing is sent anywhere, which matters when the JSON is an API response full of tokens.' },
        { name: 'Read the error, if there is one', text: 'Invalid JSON gets the exact line and column where parsing failed. Look first for a trailing comma, single quotes, or an unquoted key.' },
        { name: 'Choose pretty or minified', text: 'Pretty-print with 2 spaces, 4 spaces or tabs to read it. Minify to strip every unnecessary byte before shipping it.' },
        { name: 'Sort keys if you are comparing', text: 'Sorting alphabetically makes two versions of the same object directly comparable in a diff tool.' }
    ]
};

/* ============================================================
   HOW-TO STEPS
   ============================================================ */
function buildSteps(tool) {
    if (SPECIFIC_STEPS[tool.id]) return SPECIFIC_STEPS[tool.id];

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

module.exports = { buildSteps, buildFaqs, SPECIFIC_INTRO };
