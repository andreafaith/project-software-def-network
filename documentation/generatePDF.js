import { mdToPdf } from 'md-to-pdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = './progress_report.md';
const outputFile = './progress_report.pdf';

async function generatePDF() {
    console.log('Starting PDF generation...');
    console.log('Input file:', path.resolve(inputFile));
    console.log('Output file:', path.resolve(outputFile));

    try {
        const pdf = await mdToPdf(
            { path: inputFile },
            {
                dest: outputFile,
                pdf_options: {
                    format: 'A4',
                    margin: {
                        top: '2cm',
                        bottom: '2cm',
                        left: '2cm',
                        right: '2cm'
                    },
                    printBackground: true,
                    preferCSSPageSize: true
                },
                highlight_style: 'github',
                body_class: 'markdown-body',
                css: `
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap');
                    
                    :root {
                        --primary-color: #2563eb;
                        --secondary-color: #3b82f6;
                        --accent-color: #60a5fa;
                        --text-primary: #1f2937;
                        --text-secondary: #4b5563;
                        --background-primary: #ffffff;
                        --background-secondary: #f3f4f6;
                    }
                    
                    .markdown-body {
                        font-family: 'Inter', -apple-system, sans-serif;
                        line-height: 1.7;
                        color: var(--text-primary);
                        max-width: 100%;
                        margin: 0 auto;
                        padding: 2rem;
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        font-weight: 600;
                        line-height: 1.3;
                        margin-top: 2em;
                        margin-bottom: 1em;
                        color: var(--text-primary);
                    }
                    
                    h1 {
                        font-size: 2.5rem;
                        color: var(--primary-color);
                        border-bottom: 3px solid var(--accent-color);
                        padding-bottom: 0.5rem;
                    }
                    
                    h2 {
                        font-size: 2rem;
                        color: var(--secondary-color);
                        border-bottom: 2px solid var(--accent-color);
                        padding-bottom: 0.3rem;
                    }
                    
                    h3 {
                        font-size: 1.5rem;
                    }
                    
                    pre, code {
                        font-family: 'Fira Code', monospace;
                        background-color: var(--background-secondary);
                        border-radius: 6px;
                    }
                    
                    pre {
                        padding: 1rem;
                        margin: 1rem 0;
                        overflow-x: auto;
                    }
                    
                    code {
                        font-size: 0.9em;
                        padding: 0.2em 0.4em;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 2rem 0;
                    }
                    
                    th, td {
                        padding: 0.75rem;
                        text-align: left;
                        border: 1px solid var(--background-secondary);
                    }
                    
                    th {
                        background-color: var(--background-secondary);
                        font-weight: 600;
                    }
                    
                    blockquote {
                        border-left: 4px solid var(--accent-color);
                        margin: 1.5rem 0;
                        padding: 1rem 1.5rem;
                        background-color: var(--background-secondary);
                        font-style: italic;
                        color: var(--text-secondary);
                    }
                    
                    img {
                        max-width: 100%;
                        height: auto;
                        margin: 1.5rem 0;
                    }
                    
                    @page {
                        margin: 2cm;
                        @top-right {
                            content: "EyeNet Project Progress Report";
                            font-size: 8pt;
                            color: #666;
                        }
                        @bottom-center {
                            content: "Page " counter(page) " of " counter(pages);
                            font-size: 8pt;
                            color: #666;
                        }
                    }
                    
                    @media print {
                        .markdown-body {
                            padding: 0;
                        }
                        
                        pre, code {
                            font-size: 9pt;
                        }
                        
                        h1 { font-size: 24pt; }
                        h2 { font-size: 20pt; }
                        h3 { font-size: 16pt; }
                    }
                `
            }
        );

        if (pdf) {
            console.log('PDF generated successfully!');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

generatePDF();
