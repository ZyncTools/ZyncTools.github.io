import json
import os

with open('C:/Users/allu/Music/ZyncPDF/registry.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

tools_dir = 'C:/Users/allu/Music/ZyncPDF/tools'

file_tools = {
    'image-compressor', 'image-resizer', 'image-cropper', 'image-converter', 'image-rotate',
    'image-flip', 'image-watermark', 'meme-generator', 'exif-remover', 'image-ocr',
    'batch-rename-images', 'image-filters', 'image-blur', 'background-remover', 'svg-optimizer',
    'ico-converter', 'favicon-generator', 'image-joiner', 'image-splitter', 'image-pixelate',
    'image-grayscale', 'image-sepia', 'image-brightness-contrast', 'duplicate-image-finder',
    'base64-image-encoder', 'image-watermark-batch',
    'mp3-cutter', 'video-trimmer', 'audio-converter', 'video-converter', 'compress-audio',
    'compress-video', 'extract-audio', 'merge-audio', 'merge-video', 'volume-normalizer',
    'audio-speed-pitch', 'record-audio', 'record-screen', 'gif-maker', 'video-to-gif',
    'audio-joiner', 'ringtone-maker', 'audio-metadata-editor', 'silence-remover', 'audio-fade',
    'audio-visualizer', 'audio-trimmer', 'audio-splitter', 'audio-reverse', 'audio-amplify',
    'video-screenshot', 'video-frame-extract', 'video-speed-change', 'video-reverse',
    'video-merge-audio', 'audio-waveform',
    'pdf-to-word', 'word-to-pdf', 'pdf-to-jpg', 'jpg-to-pdf', 'merge-pdf', 'split-pdf',
    'compress-pdf', 'rotate-pdf', 'add-page-numbers', 'watermark-pdf', 'unlock-pdf',
    'protect-pdf', 'html-to-pdf', 'markdown-to-pdf', 'ebook-converter', 'ocr-pdf', 'sign-pdf',
    'delete-pages', 'extract-pages', 'rearrange-pages', 'compare-pdfs', 'pdf-redact',
    'pdf-annotate', 'pdf-highlight', 'pdf-stamp', 'pdf-form-fill', 'pdf-ocr-scan',
    'pdf-merge-images', 'pdf-add-header-footer', 'pdf-extract-images'
}

text_tools = {
    'json-formatter', 'xml-formatter', 'sql-beautify', 'html-encoder-decoder', 'url-encoder-decoder',
    'base64-text', 'hash-generator', 'uuid-generator', 'lorem-ipsum', 'word-counter',
    'case-converter', 'regex-tester', 'diff-checker', 'markdown-editor', 'qr-code-generator',
    'password-generator', 'cron-builder', 'jwt-decoder', 'unix-timestamp-converter',
    'ipv4-ipv6-converter', 'color-code-converter', 'css-minifier', 'js-minifier', 'slug-generator',
    'text-reverser', 'binary-hex-converter', 'yaml-formatter', 'toml-formatter', 'ini-editor',
    'csv-formatter',
    'unit-converter', 'binary-calculator', 'hex-calculator', 'percentage-calculator',
    'aspect-ratio-calculator', 'css-shadow-generator', 'css-gradient-generator',
    'border-radius-generator', 'flexbox-generator', 'grid-generator', 'http-status-codes',
    'user-agent-parser', 'what-is-my-ip', 'dns-lookup', 'ping-test', 'stopwatch', 'timer',
    'world-clock', 'timezone-converter', 'age-calculator', 'date-difference', 'binary-to-text',
    'ascii-converter', 'box-shadow-generator', 'color-picker', 'gradient-preview', 'font-preview',
    'json-path-finder', 'regex-generator', 'sql-formatter', 'image-metadata-viewer', 'image-compare',
    'meta-tag-generator', 'og-tag-generator', 'robots-txt-generator', 'sitemap-xml-generator',
    'schema-markup-generator', 'canonical-tag-generator', 'hreflang-generator',
    'seo-md5-hash-generator', 'seo-base64-encoder-decoder', 'seo-url-encoder-decoder',
    'html-minifier', 'css-minifier', 'js-minifier', 'seo-json-formatter', 'seo-xml-formatter',
    'seo-sql-beautifier', 'seo-regex-tester', 'seo-uuid-generator', 'seo-qr-code-generator',
    'seo-password-generator', 'seo-word-counter', 'seo-case-converter', 'seo-slug-generator',
    'seo-unix-timestamp-converter', 'seo-color-converter', 'contrast-checker',
    'seo-css-shadow-generator', 'seo-gradient-generator', 'seo-aspect-ratio-calculator',
    'pixel-to-rem-converter', 'seo-dns-lookup', 'seo-user-agent-parser'
}

results = []
for tool in data['tools']:
    tid = tool['id']
    html_path = os.path.join(tools_dir, f'{tid}.html')
    js_path = os.path.join(tools_dir, f'{tid}.js')
    
    status = 'coming-soon'
    if os.path.exists(html_path) or os.path.exists(js_path):
        status = 'implemented'
    
    libs = tool.get('libraries', [])
    library = libs[0] if libs else ''
    
    if tid in file_tools:
        tool_type = 'file'
    elif tid in text_tools:
        tool_type = 'text'
    else:
        if tool['category'] in ['image-tools', 'audio-video-tools', 'document-tools']:
            tool_type = 'file'
        else:
            tool_type = 'text'
    
    results.append({
        'id': tid,
        'name': tool['name'],
        'type': tool_type,
        'status': status,
        'library': library
    })

with open('C:/Users/allu/Music/ZyncPDF/tool-status.json', 'w', encoding='utf-8') as f:
    json.dump({'tools': results}, f, indent=2)

implemented = sum(1 for r in results if r['status'] == 'implemented')
coming_soon = sum(1 for r in results if r['status'] == 'coming-soon')
print(f'Total tools: {len(results)}')
print(f'Implemented: {implemented}')
print(f'Coming-soon: {coming_soon}')
