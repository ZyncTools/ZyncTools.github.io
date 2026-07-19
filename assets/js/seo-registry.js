/**
 * ZyncTools — SEO Registry for File Viewer
 * Maps file-type query params to SEO metadata and viewer config.
 */
window.ZyncSeoRegistry = {
    'ipynb': {
        id: 'ipynb',
        title: 'Read IPYNB Online - Free Jupyter Notebook Viewer',
        description: 'View, render, and share .ipynb Jupyter Notebook files instantly in your browser. No upload, 100% private. Supports code cells, markdown, and outputs.',
        keywords: 'read ipynb, jupyter notebook viewer, open ipynb online, view python notebook, ipynb reader',
        h1: 'Read IPYNB Files Online',
        accepts: ['.ipynb', '.json'],
        language: 'python',
        mode: 'notebook',
        related: ['py-viewer', 'json-viewer', 'csv-viewer']
    },
    'py': {
        id: 'py',
        title: 'View Python Code Online - Free PY File Viewer',
        description: 'Open and view .py Python files in your browser with syntax highlighting. No server upload. Supports line numbers, copy, and minify.',
        keywords: 'view python code, open py file, python file viewer, read py online, python code reader',
        h1: 'View Python Files Online',
        accepts: ['.py', '.txt'],
        language: 'python',
        mode: 'code',
        related: ['ipynb', 'js-viewer', 'json-viewer']
    },
    'js': {
        id: 'js',
        title: 'View JavaScript Online - Free JS File Viewer',
        description: 'Open and view .js JavaScript files in your browser with syntax highlighting. No upload required. Copy, minify, and format code.',
        keywords: 'view javascript, open js file, js file viewer, read js online, javascript code reader',
        h1: 'View JavaScript Files Online',
        accepts: ['.js', '.txt'],
        language: 'javascript',
        mode: 'code',
        related: ['ts-viewer', 'json-viewer', 'css-viewer']
    },
    'ts': {
        id: 'ts',
        title: 'View TypeScript Online - Free TS File Viewer',
        description: 'Open and view .ts TypeScript files in your browser with syntax highlighting. No upload. Copy, format, and inspect code.',
        keywords: 'view typescript, open ts file, ts file viewer, read typescript online',
        h1: 'View TypeScript Files Online',
        accepts: ['.ts', '.txt'],
        language: 'typescript',
        mode: 'code',
        related: ['js-viewer', 'json-viewer', 'css-viewer']
    },
    'json': {
        id: 'json',
        title: 'View JSON Online - Free JSON File Viewer & Formatter',
        description: 'Open, view, and format .json files instantly in your browser. Tree view, beautify, minify, and validate JSON. 100% private.',
        keywords: 'view json, open json file, json viewer, json formatter, json tree view, read json online',
        h1: 'View JSON Files Online',
        accepts: ['.json', '.txt'],
        language: 'json',
        mode: 'data',
        related: ['xml-viewer', 'csv-viewer', 'yaml-viewer']
    },
    'xml': {
        id: 'xml',
        title: 'View XML Online - Free XML File Viewer & Formatter',
        description: 'Open, view, and format .xml files in your browser. Tree view, beautify, minify, and validate XML. No upload required.',
        keywords: 'view xml, open xml file, xml viewer, xml formatter, read xml online',
        h1: 'View XML Files Online',
        accepts: ['.xml', '.txt'],
        language: 'xml',
        mode: 'data',
        related: ['json-viewer', 'html-viewer', 'csv-viewer']
    },
    'csv': {
        id: 'csv',
        title: 'View CSV Online - Free CSV File Viewer & Editor',
        description: 'Open and view .csv files in your browser. Sort, filter, and format CSV data. No upload. Supports large files.',
        keywords: 'view csv, open csv file, csv viewer, csv formatter, read csv online',
        h1: 'View CSV Files Online',
        accepts: ['.csv', '.txt'],
        language: 'csv',
        mode: 'data',
        related: ['json-viewer', 'tsv-viewer', 'sql-viewer']
    },
    'html': {
        id: 'html',
        title: 'View HTML Online - Free HTML File Viewer',
        description: 'Open and view .html files in your browser with syntax highlighting. Preview rendered output. No upload required.',
        keywords: 'view html, open html file, html viewer, html code viewer, read html online',
        h1: 'View HTML Files Online',
        accepts: ['.html', '.htm', '.txt'],
        language: 'html',
        mode: 'code',
        related: ['css-viewer', 'js-viewer', 'xml-viewer']
    },
    'css': {
        id: 'css',
        title: 'View CSS Online - Free CSS File Viewer',
        description: 'Open and view .css files in your browser with syntax highlighting. Beautify, minify, and copy CSS code.',
        keywords: 'view css, open css file, css viewer, css code viewer, read css online',
        h1: 'View CSS Files Online',
        accepts: ['.css', '.txt'],
        language: 'css',
        mode: 'code',
        related: ['html-viewer', 'js-viewer', 'scss-viewer']
    },
    'sql': {
        id: 'sql',
        title: 'View SQL Online - Free SQL File Viewer & Formatter',
        description: 'Open and view .sql files in your browser with syntax highlighting. Beautify, format, and copy SQL queries.',
        keywords: 'view sql, open sql file, sql viewer, sql formatter, read sql online',
        h1: 'View SQL Files Online',
        accepts: ['.sql', '.txt'],
        language: 'sql',
        mode: 'code',
        related: ['json-viewer', 'csv-viewer', 'mysql-viewer']
    },
    'md': {
        id: 'md',
        title: 'View Markdown Online - Free MD File Viewer',
        description: 'Open and view .md Markdown files in your browser with live preview. Split view, GitHub-style rendering. No upload.',
        keywords: 'view markdown, open md file, md viewer, markdown viewer, read markdown online',
        h1: 'View Markdown Files Online',
        accepts: ['.md', '.markdown', '.txt'],
        language: 'markdown',
        mode: 'markdown',
        related: ['html-viewer', 'json-viewer', 'rst-viewer']
    },
    'yaml': {
        id: 'yaml',
        title: 'View YAML Online - Free YAML File Viewer & Formatter',
        description: 'Open, view, and format .yaml/.yml files in your browser. Tree view, beautify, and validate YAML. 100% private.',
        keywords: 'view yaml, open yaml file, yaml viewer, yaml formatter, read yaml online',
        h1: 'View YAML Files Online',
        accepts: ['.yaml', '.yml', '.txt'],
        language: 'yaml',
        mode: 'data',
        related: ['json-viewer', 'toml-viewer', 'ini-viewer']
    },
    'ini': {
        id: 'ini',
        title: 'View INI Online - Free INI File Viewer & Editor',
        description: 'Open and view .ini configuration files in your browser. Edit, format, and validate INI. No upload required.',
        keywords: 'view ini, open ini file, ini viewer, ini editor, read ini online',
        h1: 'View INI Files Online',
        accepts: ['.ini', '.cfg', '.txt'],
        language: 'ini',
        mode: 'data',
        related: ['yaml-viewer', 'toml-viewer', 'json-viewer']
    },
    'toml': {
        id: 'toml',
        title: 'View TOML Online - Free TOML File Viewer & Formatter',
        description: 'Open, view, and format .toml configuration files in your browser. Beautify and validate TOML. 100% private.',
        keywords: 'view toml, open toml file, toml viewer, toml formatter, read toml online',
        h1: 'View TOML Files Online',
        accepts: ['.toml', '.txt'],
        language: 'toml',
        mode: 'data',
        related: ['yaml-viewer', 'ini-viewer', 'json-viewer']
    },
    'log': {
        id: 'log',
        title: 'View LOG Files Online - Free Log File Viewer',
        description: 'Open and view .log files in your browser with syntax highlighting. Filter, search, and analyze log files. No upload.',
        keywords: 'view log, open log file, log viewer, read log online, log file viewer',
        h1: 'View LOG Files Online',
        accepts: ['.log', '.txt'],
        language: 'log',
        mode: 'code',
        related: ['txt-viewer', 'json-viewer', 'csv-viewer']
    },
    'txt': {
        id: 'txt',
        title: 'View TXT Online - Free Text File Viewer',
        description: 'Open and view .txt files in your browser. Word count, line count, and plain text viewing. No upload required.',
        keywords: 'view txt, open txt file, txt viewer, text viewer, read txt online',
        h1: 'View TXT Files Online',
        accepts: ['.txt'],
        language: 'text',
        mode: 'text',
        related: ['md-viewer', 'log-viewer', 'csv-viewer']
    },
    'tsv': {
        id: 'tsv',
        title: 'View TSV Online - Free TSV File Viewer',
        description: 'Open and view .tsv Tab-Separated Values files in your browser. Format and analyze TSV data. No upload.',
        keywords: 'view tsv, open tsv file, tsv viewer, tab separated values viewer',
        h1: 'View TSV Files Online',
        accepts: ['.tsv', '.txt'],
        language: 'csv',
        mode: 'data',
        related: ['csv-viewer', 'json-viewer', 'sql-viewer']
    },
    'svg': {
        id: 'svg',
        title: 'View SVG Online - Free SVG File Viewer',
        description: 'Open and view .svg vector graphics in your browser. Render, inspect, and download SVG files. 100% private.',
        keywords: 'view svg, open svg file, svg viewer, svg renderer, read svg online',
        h1: 'View SVG Files Online',
        accepts: ['.svg', '.txt'],
        language: 'svg',
        mode: 'image',
        related: ['png-viewer', 'jpg-viewer', 'ico-viewer']
    },
    'env': {
        id: 'env',
        title: 'View ENV Online - Free Environment File Viewer',
        description: 'Open and view .env environment files in your browser. Parse, format, and validate key-value pairs. No upload.',
        keywords: 'view env, open env file, env viewer, environment file viewer, read env online',
        h1: 'View ENV Files Online',
        accepts: ['.env', '.txt'],
        language: 'ini',
        mode: 'data',
        related: ['ini-viewer', 'yaml-viewer', 'json-viewer']
    },
    'dockerfile': {
        id: 'dockerfile',
        title: 'View Dockerfile Online - Free Dockerfile Viewer',
        description: 'Open and view Dockerfile files in your browser with syntax highlighting. No upload. Inspect Docker instructions.',
        keywords: 'view dockerfile, open dockerfile, dockerfile viewer, read dockerfile online',
        h1: 'View Dockerfile Online',
        accepts: ['Dockerfile', '.txt'],
        language: 'dockerfile',
        mode: 'code',
        related: ['yaml-viewer', 'json-viewer', 'sh-viewer']
    },
    'sh': {
        id: 'sh',
        title: 'View Shell Script Online - Free SH File Viewer',
        description: 'Open and view .sh shell script files in your browser with syntax highlighting. No upload required.',
        keywords: 'view shell script, open sh file, sh viewer, bash viewer, read shell online',
        h1: 'View Shell Scripts Online',
        accepts: ['.sh', '.bash', '.txt'],
        language: 'bash',
        mode: 'code',
        related: ['py-viewer', 'js-viewer', 'dockerfile-viewer']
    },
    'php': {
        id: 'php',
        title: 'View PHP Online - Free PHP File Viewer',
        description: 'Open and view .php files in your browser with syntax highlighting. No upload. Inspect PHP code.',
        keywords: 'view php, open php file, php viewer, php code viewer, read php online',
        h1: 'View PHP Files Online',
        accepts: ['.php', '.txt'],
        language: 'php',
        mode: 'code',
        related: ['js-viewer', 'html-viewer', 'sql-viewer']
    },
    'go': {
        id: 'go',
        title: 'View Go Online - Free Go File Viewer',
        description: 'Open and view .go Golang files in your browser with syntax highlighting. No upload required.',
        keywords: 'view go, open go file, go viewer, golang viewer, read go online',
        h1: 'View Go Files Online',
        accepts: ['.go', '.txt'],
        language: 'go',
        mode: 'code',
        related: ['py-viewer', 'js-viewer', 'rust-viewer']
    },
    'rust': {
        id: 'rust',
        title: 'View Rust Online - Free Rust File Viewer',
        description: 'Open and view .rs Rust files in your browser with syntax highlighting. No upload required.',
        keywords: 'view rust, open rust file, rust viewer, read rust online, rust code viewer',
        h1: 'View Rust Files Online',
        accepts: ['.rs', '.txt'],
        language: 'rust',
        mode: 'code',
        related: ['go-viewer', 'cpp-viewer', 'js-viewer']
    },
    'cpp': {
        id: 'cpp',
        title: 'View C++ Online - Free C++ File Viewer',
        description: 'Open and view .cpp C++ files in your browser with syntax highlighting. No upload required.',
        keywords: 'view cpp, open cpp file, cpp viewer, c++ viewer, read cpp online',
        h1: 'View C++ Files Online',
        accepts: ['.cpp', '.c', '.h', '.txt'],
        language: 'cpp',
        mode: 'code',
        related: ['c-viewer', 'rust-viewer', 'go-viewer']
    },
    'java': {
        id: 'java',
        title: 'View Java Online - Free Java File Viewer',
        description: 'Open and view .java files in your browser with syntax highlighting. No upload required.',
        keywords: 'view java, open java file, java viewer, read java online, java code viewer',
        h1: 'View Java Files Online',
        accepts: ['.java', '.txt'],
        language: 'java',
        mode: 'code',
        related: ['kt-viewer', 'scala-viewer', 'cs-viewer']
    },
    'cs': {
        'id': 'cs',
        title: 'View C# Online - Free C# File Viewer',
        description: 'Open and view .cs C# files in your browser with syntax highlighting. No upload required.',
        keywords: 'view cs, open cs file, csharp viewer, c# viewer, read csharp online',
        h1: 'View C# Files Online',
        accepts: ['.cs', '.txt'],
        language: 'csharp',
        mode: 'code',
        related: ['java-viewer', 'cpp-viewer', 'js-viewer']
    },
    'rb': {
        id: 'rb',
        title: 'View Ruby Online - Free Ruby File Viewer',
        description: 'Open and view .rb Ruby files in your browser with syntax highlighting. No upload required.',
        keywords: 'view ruby, open rb file, ruby viewer, read ruby online',
        h1: 'View Ruby Files Online',
        accepts: ['.rb', '.txt'],
        language: 'ruby',
        mode: 'code',
        related: ['py-viewer', 'js-viewer', 'php-viewer']
    },
    'swift': {
        id: 'swift',
        title: 'View Swift Online - Free Swift File Viewer',
        description: 'Open and view .swift Swift files in your browser with syntax highlighting. No upload required.',
        keywords: 'view swift, open swift file, swift viewer, read swift online',
        h1: 'View Swift Files Online',
        accepts: ['.swift', '.txt'],
        language: 'swift',
        mode: 'code',
        related: ['kt-viewer', 'objc-viewer', 'java-viewer']
    },
    'kt': {
        id: 'kt',
        title: 'View Kotlin Online - Free Kotlin File Viewer',
        description: 'Open and view .kt Kotlin files in your browser with syntax highlighting. No upload required.',
        keywords: 'view kotlin, open kt file, kotlin viewer, read kotlin online',
        h1: 'View Kotlin Files Online',
        accepts: ['.kt', '.kts', '.txt'],
        language: 'kotlin',
        mode: 'code',
        related: ['java-viewer', 'swift-viewer', 'scala-viewer']
    },
    'r': {
        id: 'r',
        title: 'View R Online - Free R File Viewer',
        description: 'Open and view .r R script files in your browser with syntax highlighting. No upload required.',
        keywords: 'view r, open r file, r viewer, read r online, r script viewer',
        h1: 'View R Files Online',
        accepts: ['.r', '.R', '.txt'],
        language: 'r',
        mode: 'code',
        related: ['py-viewer', 'matlab-viewer', 'julia-viewer']
    },
    'matlab': {
        id: 'matlab',
        title: 'View MATLAB Online - Free MATLAB File Viewer',
        description: 'Open and view .m MATLAB files in your browser with syntax highlighting. No upload required.',
        keywords: 'view matlab, open matlab file, matlab viewer, read matlab online',
        h1: 'View MATLAB Files Online',
        accepts: ['.m', '.txt'],
        language: 'matlab',
        mode: 'code',
        related: ['r-viewer', 'py-viewer', 'julia-viewer']
    },
    'julia': {
        id: 'julia',
        title: 'View Julia Online - Free Julia File Viewer',
        description: 'Open and view .jl Julia files in your browser with syntax highlighting. No upload required.',
        keywords: 'view julia, open julia file, julia viewer, read julia online',
        h1: 'View Julia Files Online',
        accepts: ['.jl', '.txt'],
        language: 'julia',
        mode: 'code',
        related: ['py-viewer', 'r-viewer', 'matlab-viewer']
    }
};
